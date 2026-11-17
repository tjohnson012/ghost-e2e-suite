import { test, expect, uniqueEmail } from '../support/fixtures';
import { Portal } from '../pages/portal';
import { SiteHeader } from '../pages/site-header';
import { BASE_URL } from '../support/env';

test.describe('Member signup and sign-in (magic link)', () => {
  test('new reader signs up and is signed in by the emailed link', async ({ page, mailbox }, info) => {
    const email = uniqueEmail(`signup-${info.project.name}`);
    const portal = new Portal(page);

    await portal.openSignup();
    await portal.signUp('Test Reader', email);
    await portal.expectCheckEmail();

    await page.goto(await mailbox.magicLinkFor(email));

    // The reader sees they're signed in: "Sign in" / "Subscribe" give way to "Account"...
    await new SiteHeader(page).expectSignedIn();
    // ...and the site knows who they are.
    const me = await page.request.get('/members/api/member/');
    expect(me.status()).toBe(200);
    expect((await me.json()).email).toBe(email);
  });

  test('existing member signs back in with a new link', async ({ page, browser, mailbox }, info) => {
    const email = uniqueEmail(`return-${info.project.name}`);
    // Create the member in a separate session, then sign in fresh, like a returning reader.
    const first = await browser.newContext();
    const firstPage = await first.newPage();
    const portal1 = new Portal(firstPage);
    await portal1.openSignup();
    await portal1.signUp('Returning Reader', email);
    await firstPage.goto(await mailbox.magicLinkFor(email));
    await first.close();

    const portal = new Portal(page);
    await portal.openSignin();
    await portal.requestSignin(email);
    await portal.expectCheckEmail();

    // Newest email is the sign-in link.
    await page.goto(await mailbox.magicLinkFor(email));
    const me = await page.request.get('/members/api/member/');
    expect((await me.json()).email).toBe(email);
  });

  test('a tampered link shows an error and does not sign anyone in', async ({ page, mailbox }, info) => {
    const email = uniqueEmail(`tamper-${info.project.name}`);
    await page.request.post('/members/api/send-magic-link/', { data: { email, emailType: 'signup' }, headers: { Origin: BASE_URL } });
    const real = await mailbox.magicLinkFor(email);
    await page.goto(real.replace(/token=[^&]+/, 'token=tampered'));
    await expect(page.frameLocator('[data-testid="portal-notification-frame"]').getByText(/invalid link/i)).toBeVisible();
    const me = await page.request.get('/members/api/member/');
    expect(me.status()).not.toBe(200);
  });

  test('signup rejects an invalid email address', async ({ page }) => {
    const portal = new Portal(page);
    await portal.openSignup();
    await portal.signUp('Typo Reader', 'not-an-email');
    await expect(portal.frame.getByText(/invalid email/i)).toBeVisible();
  });
});
