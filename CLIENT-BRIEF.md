# Client brief (role-play)

Treat this as the email a real client sent after saying yes to a Jump Start.

---

> Hey Tyler,
>
> Excited to get started. Quick context: we run a paid newsletter on Ghost. We have zero automated tests, and twice in the last quarter a deploy broke signups without anyone noticing for days.
>
> What scares us most:
> 1. **Readers can't sign up or sign in.** Signup is magic-link only, via an emailed link.
> 2. **Members-only posts leak to the public**, or members can't see them.
> 3. **Our editors can't publish.** Admin login, write a post, publish it, see it live.
> 4. Site looks broken on iPhone. Half our readers are on mobile.
>
> Staging: http://localhost:2368
> Admin account: qa-admin@example.com / Staging-Pass-2026!
> Staging email goes to our test inbox: http://localhost:8025 (Mailpit, API at /api/v1)
>
> Paid subscriptions (Stripe) aren't on staging yet, so leave those out for now.
>
> Need it running in CI on every PR. Two weeks?
>
> Thanks,
> Dana, CTO
