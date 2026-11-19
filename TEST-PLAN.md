# Test plan: Dry Run Publication (Ghost 6.78)

Prepared by: Tyler Johnson, Johnson Reply · For: Dana (CTO) · Status: **Approved**

## Scope

| # | Flow | Why it matters (client's words) | Tests | Browsers |
|---|------|------|------|------|
| 1 | Member signup + sign-in (magic link) | "Readers can't sign up" | New reader signs up and is signed in by the emailed link · Existing member signs back in · Tampered link shows an error and signs no one in · Invalid email rejected | Chrome, Safari, Firefox, iPhone |
| 2 | Members-only content | "Posts leak / members locked out" | Anonymous visitor sees the paywall · Members-only text is never sent to anonymous browsers · Signed-in member reads the full post · Public posts readable by all | all 4 |
| 3 | Editor publishing | "Editors can't publish" | Write + publish in the real editor, then readers see it · Unpublish removes it from the site · Drafts never visible to readers | Chrome, Safari |
| 4 | Mobile + site health | "Half our readers are on mobile" | Key pages load with no script errors · No sideways scrolling · Homepage links resolve · Images load · Missing pages return a real 404 | all 4 |

## Out of scope (agreed)
- Paid subscriptions / Stripe checkout (not configured on staging). Recommended as phase 2.
- Newsletter email rendering and delivery.
- Ghost Admin settings screens.

## Test data approach
- **Admin auth:** log in once through the UI and reuse the saved session.
- **Members:** a unique email per test, with sign-up through the real magic-link email (read from the Mailpit staging inbox).
- **Posts:** created and deleted through the Admin API for each test. Only the flow under test goes through the UI.

## Staging requirements
- Member sign-in rate limit raised on staging (E2E runs sign up many members from one IP).
- Staff device verification disabled on staging.
- Outbound email routed to a test inbox (Mailpit).

## Risks / open questions
- Theme changes: tests target the default theme (Source). A custom theme needs a pass over `pages/site-header.ts` and the `.gh-content` selector.
- Stripe: once on staging, add checkout + the paid-tier gating tests.
