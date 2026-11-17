import { test, expect } from '@playwright/test';

// Proves the environment works. Everything else in tests/ is yours to write.
test('publication homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Dry Run Publication/);
});
