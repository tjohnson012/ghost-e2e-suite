import { test as setup, expect } from '@playwright/test';
import { ADMIN, ADMIN_STATE } from './support/env';

// Log in once through the real UI; every admin test reuses this session.
setup('admin signs in', async ({ page }) => {
  await page.goto('/ghost/#/signin');
  await page.locator('input[name="identification"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Signed in = the admin navigation is showing. (Don't wait on the URL: under load the session is
  // created and the admin renders well before the redirect from /ghost/#/ to the dashboard happens.)
  // The admin app is a large bundle, so its first load gets a longer, explicit allowance.
  await expect(page.getByRole('link', { name: 'View site', exact: true })).toBeVisible({ timeout: 20_000 });
  await page.context().storageState({ path: ADMIN_STATE });
});
