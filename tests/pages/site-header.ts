import { expect, type Page, type Locator } from '@playwright/test';

/** The publication's top navigation. On phones it collapses behind a "Menu" button. */
export class SiteHeader {
  constructor(private page: Page) {}

  private async open() {
    const burger = this.page.getByRole('button', { name: 'Menu' });
    if (await burger.isVisible()) await burger.click();
  }

  async link(name: string): Promise<Locator> {
    await this.open();
    return this.page.locator('header').getByRole('link', { name, exact: true });
  }

  async expectSignedIn() {
    await expect(await this.link('Account')).toBeVisible();
    await expect(this.page.locator('header').getByRole('link', { name: 'Sign in', exact: true })).toBeHidden();
  }

  async expectSignedOut() {
    await expect(await this.link('Sign in')).toBeVisible();
  }
}
