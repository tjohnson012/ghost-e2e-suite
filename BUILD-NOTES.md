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

This is what ongoing maintenance looks like. Bump the version, run the suite, sort every failure into **real bug** or **test out of date**, fix, and report.

**First run on Ghost 6:** 12 of 75 failed. That's 3 root causes, each showing up in several browsers.

| # | What failed | Real bug? | Cause | Fix |
|---|---|---|---|---|
| 1 | Signed-in member reads the post (4 browsers) and tampered link (4 browsers) | No | Ghost 6 added an anti-spam **integrity token** to `send-magic-link`. Our API shortcut didn't send one, so Ghost returned 400. Signup through the real popup kept working because Portal fetches the token itself. | New `requestMagicLink()` helper fetches `/members/api/integrity-token/` first. It works on Ghost 5 too, where the endpoint doesn't exist. |
| 2 | Editor can't find the title (Chrome, Safari) | No | The admin editor was rebuilt, and the `data-test-editor-title-input` hook is gone. | Use the accessible name: `getByRole('textbox', { name: 'Post title' })`. This survives the next redesign too. |
| 3 | Click into the post body hangs | No | Ghost 6 keeps a **hidden** second editor instance in the page, and the old selector matched it first. | Target only the visible editor: `[data-lexical-editor]` filtered to `visible: true`. |
| 4 | Publish button "covered" by the editor (Chrome, Safari) | **No, checked carefully** | Ghost 6 fades the header out while you type (opacity 0, clicks pass through) and brings it back **on mouse movement**. A real person always moves the mouse toward Publish; a test that teleports doesn't. We confirmed this by measuring what's under the pointer before and after moving the mouse, and by checking that a reloaded post's button works. | `publishNow()` moves the mouse first, like a person. |
| 5 | No "Boom! It's out there" confirmation | No | Ghost 6 removed that screen. After publishing, the dialog closes and you land on the posts list. The post *is* published (checked through the API and a public 200). | Assert the dialog closes and the posts list loads. The spec still proves the outcome: an anonymous reader can open the post. |

**One mistake the suite exposed in itself:** the tampered-link test fired the API call without checking the response, so the failure read "no email arrived" when the real error was a 400. Both call sites now go through one helper that asserts `201` and prints Ghost's error body.

**Result:** 75/75 passed **3 runs in a row**, no retries, in all 4 browsers.

**Worth telling the client:** a full run now takes **~2.0 min, up from ~1.1 min** on Ghost 5. Ghost 6's admin is heavier. That isn't a failure, but it's a trend to watch.

**Product bugs found in this upgrade: 0.** That's a normal outcome: most upgrade failures are tests relying on things that changed on purpose. Telling the two apart quickly and correctly is the job. Calling #4 a bug would have been the wrong call.
