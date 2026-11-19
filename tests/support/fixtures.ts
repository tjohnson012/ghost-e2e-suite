import { test as base, expect, request, type APIRequestContext, type BrowserContext, type BrowserContextOptions, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, MAILPIT_URL, ADMIN_STATE } from './env';

/** Reads the staging inbox (Mailpit) so tests can follow emailed magic links. */
export class Mailbox {
  constructor(private api: APIRequestContext) {}

  async magicLinkFor(to: string): Promise<string> {
    let id = '';
    await expect
      .poll(async () => {
        const res = await this.api.get('/api/v1/search', { params: { query: `to:"${to}"` } });
        const { messages } = await res.json();
        id = messages?.[0]?.ID ?? '';
        return id;
      }, { message: `no email arrived for ${to}`, timeout: 15_000 })
      .not.toBe('');
    const msg = await (await this.api.get(`/api/v1/message/${id}`)).json();
    const link = String(msg.Text).match(/https?:\/\/\S+\/members\/\?token=[^\s"'<>]+/)?.[0];
    expect(link, `magic link in email to ${to}`).toBeTruthy();
    return link!;
  }
}

type Post = { id: string; url: string; title: string };

/** Creates and cleans up test data through Ghost's Admin API, never through the UI. */
export class GhostAdmin {
  private created: string[] = [];
  constructor(private api: APIRequestContext) {}

  async createPost(opts: { title: string; html: string; status?: 'published' | 'draft'; visibility?: 'public' | 'members' }): Promise<Post> {
    const res = await this.api.post('/ghost/api/admin/posts/?source=html', {
      data: { posts: [{ status: 'published', visibility: 'public', ...opts }] },
    });
    expect(res.status(), await res.text()).toBe(201);
    const post = (await res.json()).posts[0];
    this.created.push(post.id);
    return { id: post.id, url: post.url, title: post.title };
  }

  track(id: string) { this.created.push(id); }

  async cleanup() {
    for (const id of this.created) await this.api.delete(`/ghost/api/admin/posts/${id}/`);
  }
}

/** A fresh, never-used email per test, so tests never depend on each other. */
/** A suffix that's unique even when two workers start in the same millisecond. */
export function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function uniqueEmail(tag: string) {
  return `reader-${tag}-${uniqueId()}@example.com`;
}

/**
 * Asks Ghost to email a magic link, the way Portal does.
 * Ghost 6+ requires an anti-spam integrity token first; Ghost 5 has no such endpoint, so it's optional.
 */
export async function requestMagicLink(api: APIRequestContext, email: string, emailType: 'signup' | 'signin' = 'signup') {
  const headers = { Origin: BASE_URL };
  const tokenRes = await api.get('/members/api/integrity-token/', { headers });
  const integrityToken = tokenRes.ok() ? await tokenRes.text() : undefined;
  const res = await api.post('/members/api/send-magic-link/', { data: { email, emailType, integrityToken }, headers });
  expect(res.status(), `send-magic-link for ${email}: ${await res.text()}`).toBe(201);
}

/** Signs a brand-new member in via the real magic-link email, without clicking through the popup. */
export async function signInAsNewMember(page: Page, mailbox: Mailbox, tag: string) {
  const email = uniqueEmail(tag);
  await requestMagicLink(page.request, email);
  await page.goto(await mailbox.magicLinkFor(email));
  return email;
}

/**
 * Ghost loads its signup popup, search and theme images from public CDNs. Ghost itself answers in
 * milliseconds, but a slow CDN can add 5-10 s to every page load and time tests out. Each file is
 * fetched once per run, then served from disk. Same URLs, same versions as production. A Ghost
 * upgrade changes the URLs, so new files are fetched automatically.
 */
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|static\.ghost\.org)\//;
const CDN_CACHE = path.join(process.cwd(), '.cdn-cache');

export async function serveCdnFromCache(context: BrowserContext) {
  await context.route(CDN, async (route) => {
    const key = path.join(CDN_CACHE, createHash('sha1').update(route.request().url()).digest('hex'));
    if (fs.existsSync(`${key}.json`)) {
      const { status, contentType } = JSON.parse(fs.readFileSync(`${key}.json`, 'utf8'));
      return route.fulfill({ status, contentType, body: fs.readFileSync(`${key}.body`) });
    }
    let res, body;
    try {
      res = await route.fetch();
      body = await res.body();
    } catch {
      return; // the page closed while this file was downloading; nothing is waiting for it
    }
    if (res.ok()) {
      fs.mkdirSync(CDN_CACHE, { recursive: true });
      const tmp = `${key}.${process.pid}.${Math.random().toString(36).slice(2)}`; // parallel workers: write, then rename
      fs.writeFileSync(`${tmp}.body`, body);
      fs.renameSync(`${tmp}.body`, `${key}.body`);
      fs.writeFileSync(`${tmp}.json`, JSON.stringify({ status: res.status(), contentType: res.headers()['content-type'] }));
      fs.renameSync(`${tmp}.json`, `${key}.json`);
    }
    await route.fulfill({ response: res, body }).catch(() => {});
  });
}

type NewContext = (options?: BrowserContextOptions) => Promise<BrowserContext>;

export const test = base.extend<{ mailbox: Mailbox; ghost: GhostAdmin; newContext: NewContext }>({
  context: async ({ context }, use) => {
    await serveCdnFromCache(context);
    await use(context);
    await context.unrouteAll({ behavior: 'ignoreErrors' });
  },
  /** For a second, separate browser session in a test (e.g. an anonymous reader). Closed automatically. */
  newContext: async ({ browser }, use) => {
    const opened: BrowserContext[] = [];
    await use(async (options) => {
      const ctx = await browser.newContext(options);
      await serveCdnFromCache(ctx);
      opened.push(ctx);
      return ctx;
    });
    for (const ctx of opened) {
      await ctx.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {}); // the test may have closed it already
      await ctx.close().catch(() => {});
    }
  },
  mailbox: async ({}, use) => {
    const api = await request.newContext({ baseURL: MAILPIT_URL });
    await use(new Mailbox(api));
    await api.dispose();
  },
  ghost: async ({}, use) => {
    const api = await request.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE, extraHTTPHeaders: { Origin: BASE_URL } });
    const ghost = new GhostAdmin(api);
    await use(ghost);
    await ghost.cleanup();
    await api.dispose();
  },
});
export { expect };
