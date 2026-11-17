import { test, expect } from '../support/fixtures';
import { ADMIN_STATE } from '../support/env';
import { Editor } from '../pages/editor';

test.use({ storageState: ADMIN_STATE });

test.describe('Editor publishing', () => {
  test('editor writes and publishes a post; readers can see it', async ({ page, browser, ghost }, info) => {
    const title = `Published from the editor ${info.project.name} ${Date.now()}`;
    const editor = new Editor(page);
    await editor.newPost();
    await editor.write(title, 'Body written in the Ghost editor.');
    ghost.track(editor.postId());
    await editor.publishNow();

    // Check as an anonymous reader, not the logged-in editor.
    const reader = await (await browser.newContext()).newPage();
    await reader.goto('/');
    await reader.getByRole('link', { name: title }).first().click();
    await expect(reader.getByRole('heading', { name: title })).toBeVisible();
    await expect(reader.locator('.gh-content')).toContainText('Body written in the Ghost editor.');
    await reader.context().close();
  });

  test('unpublishing takes the post off the public site', async ({ page, request, ghost }, info) => {
    const post = await ghost.createPost({ title: `To unpublish ${info.project.name} ${Date.now()}`, html: '<p>Temporary.</p>' });
    expect((await request.get(post.url)).status()).toBe(200);

    const editor = new Editor(page);
    await editor.open(post.id);
    await editor.unpublish();

    await expect.poll(async () => (await request.get(post.url)).status()).toBe(404);
  });

  test('draft posts are never visible to readers', async ({ request, ghost }, info) => {
    const post = await ghost.createPost({ title: `Secret draft ${info.project.name} ${Date.now()}`, html: '<p>Not yet.</p>', status: 'draft' });
    const home = await (await request.get('/')).text();
    expect(home).not.toContain(post.title);
    const slug = post.url.match(/\/p\/|\/([^/]+)\/?$/)?.[1];
    if (slug) expect((await request.get(`/${slug}/`)).status()).toBe(404);
  });
});
