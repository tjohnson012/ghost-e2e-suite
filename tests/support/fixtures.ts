import { test as base, expect, request, type APIRequestContext, type Page } from '@playwright/test';
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
export function uniqueEmail(tag: string) {
  return `reader-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}

/** Signs a brand-new member in via the real magic-link email, without clicking through the popup. */
export async function signInAsNewMember(page: Page, mailbox: Mailbox, tag: string) {
  const email = uniqueEmail(tag);
  const res = await page.request.post('/members/api/send-magic-link/', {
    data: { email, emailType: 'signup' },
    headers: { Origin: BASE_URL },
  });
  expect(res.status()).toBe(201);
  await page.goto(await mailbox.magicLinkFor(email));
  return email;
}

export const test = base.extend<{ mailbox: Mailbox; ghost: GhostAdmin }>({
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
