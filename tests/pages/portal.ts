import { expect, type Page, type FrameLocator } from '@playwright/test';

/** Ghost's signup/sign-in popup ("Portal") lives inside an iframe. */
export class Portal {
  readonly frame: FrameLocator;
  constructor(private page: Page) {
    this.frame = page.frameLocator('[data-testid="portal-popup-frame"]');
  }

  async openSignup() {
    await this.page.goto('/#/portal/signup');
    await expect(this.frame.getByRole('button', { name: 'Sign up' })).toBeVisible();
  }

  async openSignin() {
    await this.page.goto('/#/portal/signin');
    await expect(this.frame.getByRole('button', { name: 'Continue' })).toBeVisible();
  }

  async signUp(name: string, email: string) {
    await this.frame.locator('input[name="name"]').fill(name);
    await this.frame.locator('input[name="email"]').fill(email);
    await this.frame.getByRole('button', { name: 'Sign up' }).click();
  }

  async requestSignin(email: string) {
    await this.frame.locator('input[name="email"]').fill(email);
    await this.frame.getByRole('button', { name: 'Continue' }).click();
  }

  async expectCheckEmail() {
    await expect(this.frame.getByText(/check your email/i)).toBeVisible();
  }
}
