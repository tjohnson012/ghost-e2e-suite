# Dry run: full Jump Start on Ghost, in one weekend

Goal: do exactly what you'd do for a paying client, with AI as your pair, and find out where it gets stuck while nothing is at stake.

Rule: **you drive.** Claude Code writes code when you ask it to. You decide what gets tested, read every test, and can explain every line.

## Start / stop the "client's staging"
```
colima start                 # Docker (once per reboot)
npm run env:up               # Ghost + Mailpit + seed admin
npm test                     # all 4 browsers
npm run env:down             # wipe everything (fresh start)
```
- Site: http://localhost:2368. Admin: http://localhost:2368/ghost. Inbox: http://localhost:8025

## Saturday

**1. Test plan (1 hr, no code).** Read CLIENT-BRIEF.md and click through the app yourself. Fill in TEST-PLAN.md: the flows, the tests per flow, and what's out of scope. This is the doc you'd send Dana for sign-off.

**2. Admin flows (2–3 hrs).**
- Log in once in a setup project and save `storageState`, so no test logs in by itself.
- Then test: create post → publish → visible on the site. Edit, unpublish, gone.
- Page objects for the admin editor.

**3. The hard flow: member signup via magic link (2–3 hrs).** This is where AI tends to stall:
- Sign up with a unique email per test (e.g. `reader+<timestamp>@example.com`).
- Fetch the email from the Mailpit API (`GET /api/v1/search?query=to:<email>`, then `GET /api/v1/message/<ID>`), pull the link out, and visit it.
- Assert you're signed in.
- Then do sign-in for an existing member, and an invalid or expired link.
- Write this as a reusable `mailbox` fixture. You'll reuse it on real clients.

## Sunday

**4. Content gating (2 hrs).**
- Create a members-only post through the Admin API, or the UI as a fallback.
- Check: anonymous visitors see the paywall, a signed-in member sees the full post.
- Test data setup should go through the API, not UI clicking.

**5. Mobile + site health (1 hr).**
- On iPhone: nothing wider than the screen, navigation works, signup works.
- Every internal link resolves (you've written this test 6 times already).

**6. CI + handoff (2 hrs).**
- Push to a GitHub repo and make the workflow in `.github/workflows/e2e.yml` go green.
- Write the README Dana's team would get: how to run, how to add a test, and how to read a failure (trace viewer).
- Run the full suite 3 times in a row. Any test that fails even once is flaky: fix it, don't retry it.

## Definition of done (same as a real client)
- [ ] TEST-PLAN.md covers all 4 of Dana's concerns
- [ ] ~15–25 tests, passing in all 4 browsers, 3 runs in a row
- [ ] No `waitForTimeout`, no hard-coded test emails, no test depends on another
- [ ] Green in GitHub Actions
- [ ] README a stranger could follow
- [ ] You can explain any test out loud without reading it first

## Keep a stuck log (most important deliverable)
Every time the AI goes in circles or you didn't know the answer, write one line in STUCK-LOG.md: what happened and how you got out. That list is your real prep for client work, and it tells us how accurate the 80% estimate was.

## Good first prompt for Claude Code
> Read CLIENT-BRIEF.md, TEST-PLAN.md and playwright.config.ts. Don't write any tests yet. Propose a folder structure, the fixtures we'll need (auth storageState, Mailpit mailbox, API-based test data) and the order to build them in. Explain each choice in one sentence.
