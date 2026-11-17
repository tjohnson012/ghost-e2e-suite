# Ghost E2E suite: a sample Jump Start deliverable

This is a complete Playwright end-to-end suite for [Ghost](https://ghost.org), the open-source publishing platform, built to the same standard as a paid **Jump Start** from [Johnson Reply](https://johnsonreply.com).

It's what a client receives: a written test plan, a suite in their repo, CI that runs it on every push, and this README so their team can own it.

- **Client brief it was built against:** [CLIENT-BRIEF.md](CLIENT-BRIEF.md) (role-play)
- **Test plan:** [TEST-PLAN.md](TEST-PLAN.md)
- **Live test report (updated on every push to main):** https://tjohnson012.github.io/ghost-e2e-suite/
- **Notes from the build, including what was hard:** [BUILD-NOTES.md](BUILD-NOTES.md)

## What it covers

| Concern (client's words) | Spec | Browsers |
|---|---|---|
| "Readers can't sign up or sign in" | `tests/members/signup.spec.ts`: signup, magic-link email, returning sign-in, tampered link, invalid email | Chrome, Safari, Firefox, iPhone |
| "Members-only posts leak" | `tests/members/gating.spec.ts`: paywall shown, **body never sent to the browser**, members read it, public stays public | all 4 |
| "Our editors can't publish" | `tests/admin/publishing.spec.ts`: write + publish in the real editor, unpublish, drafts stay private | Chrome, Safari |
| "Site looks broken on iPhone" | `tests/site/health.spec.ts`: no script errors, no sideways scroll, links resolve, images load, real 404s | all 4 |

## Run it

Requires Docker and Node 20+.

```bash
npm ci
npx playwright install
npm run env:up        # Ghost + Mailpit test inbox + seeded admin
npm test              # all 4 browsers
npm run report        # open the HTML report
npm run env:down      # wipe the environment
```

- Ghost runs at http://localhost:2368, and its admin at http://localhost:2368/ghost.
- Every email Ghost sends lands in Mailpit at http://localhost:8025.

## How it's built

- **One login, reused.** `tests/auth.setup.ts` signs the admin in once through the real UI and saves the session. Admin tests start already logged in.
- **Real emails, real links.** The `Mailbox` fixture reads the staging inbox through Mailpit's API and follows the actual magic link Ghost sent. Nothing is stubbed.
- **Test data through the API, not the UI.** `GhostAdmin` creates posts through Ghost's Admin API and deletes them after each test. Only the flow under test is clicked through.
- **Independent tests.** Every test makes its own data with a unique email, so tests can run in any order, in parallel.
- **Page objects for the tricky UI.** `pages/portal.ts` (the signup popup lives in an iframe), `pages/editor.ts` (Ghost's editor and publish flow), `pages/site-header.ts` (navigation collapses behind a menu on phones).
- **No sleeps.** Only web-first assertions and polling. No retries in config: a flaky test gets fixed, not retried.

## Adding a test

1. Put it in the folder that matches the concern (`members/`, `admin/`, `site/`).
2. Import `test` and `expect` from `tests/support/fixtures`. That gives you the `mailbox` and `ghost` fixtures.
3. Create the data the test needs through `ghost.createPost(...)`. It's cleaned up automatically.
4. Run just your file: `npx playwright test tests/members/your.spec.ts --project=chrome`.

## Reading a failure

Every failure saves a screenshot and a full trace. Open the HTML report (`npm run report`) and click the failed test. The trace shows each step, the DOM at that moment, network calls and console output.

## Staging requirements (for the client)

Two settings differ from production, and both are in `docker-compose.yml`:
- **Member sign-in rate limit raised.** Ghost blocks many sign-ins from one IP, and an E2E run signs up dozens of members. Production keeps the default.
- **Staff device verification off.** Otherwise every admin login needs an emailed code.
