import { expect, type Page } from '@playwright/test';

/** Ghost Admin's post editor and its publish / unpublish flows. */
export class Editor {
  constructor(private page: Page) {}

  /** Each test opens a fresh page, so Ghost 6's large admin bundle boots from scratch first. Allow for it. */
  private async editorReady() {
    await expect(this.page.getByRole('textbox', { name: 'Post title' })).toBeVisible({ timeout: 20_000 });
  }

  async newPost() {
    await this.page.goto('/ghost/#/editor/post');
    await this.editorReady();
  }

  async open(postId: string) {
    await this.page.goto(`/ghost/#/editor/post/${postId}`);
    await this.editorReady();
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
    await this.page.getByRole('button', { name: /publish post, right now/i }).click();
    // While publishing, the confirm button relabels itself "Publishing". Done = you land on the posts list.
    // (Ghost 6 sometimes shows a "Boom! It's out there" popup there too, depending on site state. Not asserted.)
    await expect(this.page).toHaveURL(/#\/posts/, { timeout: 20_000 });
  }

  async unpublish() {
    await this.page.getByRole('button', { name: 'Unpublish' }).click();
    await this.page.getByRole('button', { name: /unpublish and revert to private draft/i }).click();
    await expect(this.page.getByText('Post reverted to a draft.')).toBeVisible();
  }
}
