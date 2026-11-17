import { expect, type Page } from '@playwright/test';

/** Ghost Admin's post editor and its publish / unpublish flows. */
export class Editor {
  constructor(private page: Page) {}

  async newPost() {
    await this.page.goto('/ghost/#/editor/post');
    await expect(this.page.locator('[data-test-editor-title-input]')).toBeVisible();
  }

  async open(postId: string) {
    await this.page.goto(`/ghost/#/editor/post/${postId}`);
    await expect(this.page.locator('[data-test-editor-title-input]')).toBeVisible();
  }

  async write(title: string, body: string) {
    await this.page.locator('[data-test-editor-title-input]').fill(title);
    await this.page.locator('[data-kg="editor"] [contenteditable="true"]').first().click();
    await this.page.keyboard.type(body);
    // Ghost autosaves a draft; wait until the post has a real id in the URL.
    await expect(this.page).toHaveURL(/#\/editor\/post\/[0-9a-f]{24}/);
  }

  postId(): string {
    return this.page.url().match(/editor\/post\/([0-9a-f]{24})/)![1];
  }

  async publishNow() {
    await this.page.locator('[data-test-button="publish-flow"]').first().click();
    await this.page.locator('[data-test-button="continue"]').click();
    // Ghost's confirm button pulses forever (CSS animation "pulse-green"). An element
    // that never stops moving never passes Playwright's "stable" check, so the click
    // hangs. Switch the animation off for this one button: same button, same click.
    await this.page.addStyleTag({ content: '.gh-btn-pulse { animation: none !important; }' });
    await this.page.getByRole('button', { name: /publish post, right now/i }).click();
    await expect(this.page.getByText(/boom! it.s out there/i)).toBeVisible();
  }

  async unpublish() {
    await this.page.getByRole('button', { name: 'Unpublish' }).click();
    await this.page.getByRole('button', { name: /unpublish and revert to private draft/i }).click();
    await expect(this.page.getByText('Post reverted to a draft.')).toBeVisible();
  }
}
