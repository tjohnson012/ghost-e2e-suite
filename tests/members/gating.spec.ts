import { test, expect, signInAsNewMember, uniqueId } from '../support/fixtures';

/** The article body itself, not excerpts in "read more" cards. */
const body = (page: import('@playwright/test').Page) => page.locator('.gh-content');

const SECRET = 'Only paying attention members should read this paragraph.';

test.describe('Members-only content', () => {
  test('anonymous visitor sees the paywall, not the post body', async ({ page, ghost }, info) => {
    const post = await ghost.createPost({
      title: `Members only ${info.project.name} ${uniqueId()}`,
      html: `<p>Public teaser.</p><!--members-only--><p>${SECRET}</p>`,
      visibility: 'members',
    });
    await page.goto(post.url);
    await expect(page.getByRole('heading', { name: post.title })).toBeVisible();
    await expect(body(page)).not.toContainText(SECRET);
    await expect(page.getByText(/this post is for subscribers only/i)).toBeVisible();
  });

  test('the post body is not in the page source for anonymous visitors', async ({ request, ghost }, info) => {
    const post = await ghost.createPost({
      title: `Source leak check ${info.project.name} ${uniqueId()}`,
      html: `<p>${SECRET}</p>`,
      visibility: 'members',
    });
    // Hiding with CSS isn't enough: the text must never be sent to the browser.
    const html = await (await request.get(post.url)).text();
    expect(html).not.toContain(SECRET);
  });

  test('signed-in member reads the full post', async ({ page, ghost, mailbox }, info) => {
    const post = await ghost.createPost({
      title: `Member read ${info.project.name} ${uniqueId()}`,
      html: `<p>${SECRET}</p>`,
      visibility: 'members',
    });
    await signInAsNewMember(page, mailbox, `gating-${info.project.name}`);
    await page.goto(post.url);
    await expect(body(page)).toContainText(SECRET);
    await expect(page.getByText(/this post is for subscribers only/i)).toHaveCount(0);
  });

  test('public posts stay readable by everyone', async ({ page, ghost }, info) => {
    const post = await ghost.createPost({
      title: `Public ${info.project.name} ${uniqueId()}`,
      html: '<p>Anyone can read this.</p>',
      visibility: 'public',
    });
    await page.goto(post.url);
    await expect(body(page)).toContainText('Anyone can read this.');
  });
});
