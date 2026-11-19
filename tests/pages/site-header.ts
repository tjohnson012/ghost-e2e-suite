import { expect, type Page, type Locator } from '@playwright/test';

/** The publication's top navigation. On phones it collapses behind a "Menu" button. */
export class SiteHeader {
  constructor(private page: Page) {}

  private async open() {
    const burger = this.page.getByRole('button', { name: 'Menu' });
    const home = this.page.locator('header').getByRole('link', { name: 'Home', exact: true });
    // isVisible() checks once, instantly. Wait until the header has rendered one layout or the other.
    await expect(burger.or(home).first()).toBeVisible();
    if (await home.isVisible()) return; // desktop: links are already showing
    // Phone: the Menu button can appear before the theme's script has wired it up, so an early tap
    // does nothing. Tap again until the menu actually opens, like a person would.
    await expect(async () => {
      if (!(await home.isVisible())) await burger.click();
      await expect(home).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
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
