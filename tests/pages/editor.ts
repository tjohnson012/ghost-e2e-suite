import { expect, type Page } from '@playwright/test';

/** Ghost Admin's post editor and its publish / unpublish flows. */
export class Editor {
  constructor(private page: Page) {}

  async newPost() {
    await this.page.goto('/ghost/#/editor/post');
    await expect(this.page.getByRole('textbox', { name: 'Post title' })).toBeVisible();
  }

  async open(postId: string) {
    await this.page.goto(`/ghost/#/editor/post/${postId}`);
    await expect(this.page.getByRole('textbox', { name: 'Post title' })).toBeVisible();
  }

  async write(title: string, body: string) {
    await this.page.getByRole('textbox', { name: 'Post title' }).fill(title);
    // Ghost 6 keeps a hidden second editor instance in the page; only click the visible one.
    await this.page.locator('[data-lexical-editor="true"]').filter({ visible: true }).first().click();
    await this.page.keyboard.type(body);
    // Ghost autosaves a draft; wait until the post has a real id in the URL.
    await expect(this.page).toHaveURL(/#\/editor\/post\/[0-9a-f]{24}/);
  }

  postId(): string {
    return this.page.url().match(/editor\/post\/([0-9a-f]{24})/)![1];
  }

  async publishNow() {
    // Ghost 6 fades the header out while you type and brings it back when the mouse moves.
    // Move the mouse like a person would before reaching for Publish.
    await this.page.mouse.move(200, 200, { steps: 5 });
    await this.page.getByRole('button', { name: 'Publish', exact: true }).click();
    await this.page.getByRole('button', { name: /continue, final review/i }).click();
    const confirm = this.page.getByRole('button', { name: /publish post, right now/i });
    await confirm.click();
    // Ghost 6 has no "Boom!" screen any more: the dialog closes and you land back on the posts list.
    await expect(confirm).toBeHidden();
    await expect(this.page).toHaveURL(/#\/posts/);
  }

  async unpublish() {
    await this.page.getByRole('button', { name: 'Unpublish' }).click();
    await this.page.getByRole('button', { name: /unpublish and revert to private draft/i }).click();
    await expect(this.page.getByText('Post reverted to a draft.')).toBeVisible();
  }
}
