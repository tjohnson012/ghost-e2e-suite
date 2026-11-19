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
*(Ghost 6 dropped the pulse animation, so the workaround was removed in the upgrade below. The `globalTimeout` stays.)*

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

---

## Upgrade: Ghost 5.130.6 → 6.78.0 (major version)

This is what ongoing maintenance looks like. Bump the version, run the suite, sort every failure into **real bug** or **test out of date**, fix it, then prove the fix under stress, not just once.

### Round 1: the first run on Ghost 6 (12 of 75 failed, 5 causes)

| # | What failed | Real bug? | Cause | Fix |
|---|---|---|---|---|
| 1 | Member sign-in through the API (8 runs) | No | Ghost 6 added an anti-spam **integrity token** to `send-magic-link`. Our API shortcut didn't send one, so Ghost returned 400. Signing up through the real popup kept working because Portal fetches the token itself. | New `requestMagicLink()` fetches `/members/api/integrity-token/` first. It also works on Ghost 5, where that endpoint doesn't exist. |
| 2 | Editor title not found | No | The admin editor was rebuilt, and the `data-test-editor-title-input` hook is gone. | Find it by accessible name: `getByRole('textbox', { name: 'Post title' })`. That survives the next redesign too. |
| 3 | Clicking into the post body hangs | No | Ghost 6 keeps a **hidden** second editor in the page, and the old selector matched it first. | Target only the visible editor. |
| 4 | Publish button "covered" by the editor | **No. Checked carefully.** | Ghost 6 fades the header out while you type (opacity 0, clicks pass through) and brings it back **when the mouse moves**. A person always moves the mouse toward Publish; a test that jumps straight there doesn't. Confirmed by measuring what's under the pointer before and after moving the mouse. | `publishNow()` moves the mouse first, like a person. |
| 5 | Old "publish done" signal missing | No | The publish flow ends differently: the dialog closes and you land on the posts list. A "Boom! It's out there" popup appears **sometimes**, depending on site state, so it can't be the signal. | Done = you're on the posts list (verified against the API: the post really is published). |

One weakness the suite exposed in itself: the tampered-link test ignored the API response, so a 400 showed up as "no email arrived." Both call sites now go through one helper that asserts `201` and prints Ghost's error.

### Round 2: "passes 3 times" isn't good enough

Round 1 passed 3 runs in a row locally. **CI then failed 1 of 75.** Every intermittent failure got a root cause before it was fixed, and each fix was proven by running the affected tests 15–20 times in parallel.

| Intermittent failure | Root cause | Fix | Proof |
|---|---|---|---|
| Publish "didn't finish" in CI | **My own assertion.** The confirm button relabels itself "Publishing" and stays in the dialog, so "the button is gone" passed early, before publishing finished. | Wait for the outcome (the posts list), not a button disappearing. | 40/40 publishes finished, the slowest in 1.4 s |
| Two tests collided | Titles used `Date.now()`, and two parallel workers got **the same millisecond**. One test deleted the other's post. | `uniqueId()` adds a random suffix to every title. | 121/121 admin runs (20 per test, Chrome and Safari) |
| Random timeouts across many tests | Ghost 6 loads its signup popup, search and theme images from **public CDNs** (jsdelivr, static.ghost.org). Ghost answered in under 60 ms; the CDN took **up to 10 s per page**. | Fetch each CDN file once per run, then serve it from disk. Same URLs and versions as production. | Full run went from **1.9 min to ~30 s** |
| iPhone: "Account" not found | The page object used `isVisible()`, which checks **once, instantly**. It also tapped the menu before the theme's script had hooked it up, so the tap did nothing. | Wait for the header to render, then tap until the menu actually opens, like a person would. | 121/121 signup runs on iPhone + Chrome |
| Admin login or editor "not found" under load | Each test opens a fresh page, so Ghost 6's large admin bundle boots from scratch. Under heavy machine load that takes more than 5 s. Logs proved the login itself had succeeded. | Check for "signed in" by the admin navigation (not a URL redirect), and give the admin's first load an explicit, commented 20 s allowance. | |

**Not test problems:** one local run slowed to 3+ minutes when the Mac's load average hit 20–40 (other apps and my own stress runs). Ghost's own logs showed only expected noise: dev-mode email logging and the theme's "slow helper" warning under load.

### What to tell the client

- **Product bugs found: 0.** That's a normal upgrade outcome. Telling "the app changed on purpose" from "the app broke" quickly and correctly is the job. Calling #4 a bug would have been the wrong call.
- **The suite is now faster and sturdier than before the upgrade**: no CDN dependency, unique test data, no instant-check races.
- **Watch item:** Ghost 6's admin is heavier to load than Ghost 5's.
