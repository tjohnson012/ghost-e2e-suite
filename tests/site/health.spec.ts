import { test, expect } from '../support/fixtures';

const PAGES = ['/', '/about/', '/coming-soon/'];

test.describe('Site health', () => {
  for (const path of PAGES) {
    test(`${path} loads with no script errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('main, .site-main, article').first()).toBeVisible();
      expect(errors).toEqual([]);
    });

    test(`${path} fits the screen (no sideways scrolling)`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('every internal link on the homepage resolves', async ({ page, request }) => {
    await page.goto('/');
    const links = await page.locator('a[href]').evaluateAll((as) =>
      [...new Set(as.map((a) => (a as HTMLAnchorElement).href.split('#')[0]))]
        .filter((h) => h.startsWith(location.origin) && !h.includes('/ghost/')));
    expect(links.length).toBeGreaterThan(0);
    for (const url of links) {
      expect.soft((await request.get(url)).status(), url).toBeLessThan(400);
    }
  });

  test('images on the homepage all load', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); // trigger lazy-loaded images
    await page.waitForLoadState('networkidle');
    const broken = await page.locator('img').evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    expect(broken).toEqual([]);
  });

  test('a missing page returns a real 404', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist/');
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/404|page not found/i).first()).toBeVisible();
  });
});
