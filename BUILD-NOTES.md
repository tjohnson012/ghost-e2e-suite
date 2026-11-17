# Build notes: what was hard, and how it was solved

Every E2E suite runs into the same kind of problem: the app does something reasonable that a naive test misreads. These are the ones this build hit, in order. A client gets this file too, because it explains choices that would otherwise look strange in the code.

### 1. Signups worked in Chrome, then failed everywhere else
**Symptom:** after a few runs, "no email arrived" in Safari, Firefox and iPhone.
**Cause:** Ghost's spam protection, `Too many different sign-in attempts, try again in 10 minutes` (HTTP 429). One IP signing up dozens of members looks like an attack.
**Fix:** raise `spam.member_login` limits **on staging only** (`docker-compose.yml`). It's listed as a staging requirement in the README, and production keeps the default.
**Lesson:** when tests pass alone and fail together, check rate limits before blaming the tests.

### 2. A click that hung for 14 minutes
**Symptom:** the "Publish post, right now" button was visible and enabled, but `click()` never returned.
**Cause:** the button has an infinite CSS pulse animation (`pulse-green`). Playwright only clicks elements that are stable, and this one never stops moving.
**Fix:** switch off that one animation before clicking (`pages/editor.ts`, with a comment). Also added `globalTimeout`, so a hang fails CI in minutes instead of burning an hour.
**Lesson:** don't use `force: true` to "fix" a stuck click. Find out why the element isn't actionable.

### 3. The signup form lives inside an iframe
Ghost's signup popup ("Portal") renders in `iframe[data-testid="portal-popup-frame"]`. Regular page locators can't see inside it. `pages/portal.ts` wraps it in a `frameLocator`. The form also has a hidden honeypot `phonenumber` field, which tests must leave empty.

### 4. "Signed in" looks different on a phone
On iPhone, the "Account" link that proves you're signed in sits behind the "Menu" button. `pages/site-header.ts` opens the menu when it's visible, which is what a real reader does. One assertion then works on every screen size.

### 5. The same text appears twice on a post
The post body also shows up in a "read more" excerpt card, so `getByText` matched twice. Assertions are scoped to the article body (`.gh-content`).

### 6. Testing a tampered link realistically
A made-up URL (`/members/?token=fake`) silently lands on the homepage with no message, which proves nothing. Real magic links carry `&action=signup`. The test takes a **real** emailed link and tampers only the token, and then Ghost correctly shows "Signup error: Invalid link".

### 7. Hiding members-only content isn't the same as not sending it
Checking that the paywall is visible isn't enough. A theme could ship the full text and hide it with CSS. `gating.spec.ts` fetches the raw HTML as an anonymous visitor and asserts the members-only text is **not in it**.
