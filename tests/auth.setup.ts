import { test as setup, expect } from '@playwright/test';
import { ADMIN, ADMIN_STATE } from './support/env';

// Log in once through the real UI; every admin test reuses this session.
setup('admin signs in', async ({ page }) => {
  await page.goto('/ghost/#/signin');
  await page.locator('input[name="identification"]').fill(ADMIN.email);
  await page.locator('input[name="password"]').fill(ADMIN.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/ghost\/#\/(dashboard|analytics|site|posts)/);
  await page.context().storageState({ path: ADMIN_STATE });
});
