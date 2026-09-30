# Tour the broker

No applications in this section. It puts a realistic slice of configuration
on an empty broker so there is something to look at, and so the vocabulary
the rest of the workshop uses means something.

Press **Play**, then open <http://localhost:8080> alongside the cockpit.

## What was created

Four queues, three client profiles, two ACL profiles and four client
usernames. They are deliberately not identical.

## Queues

Look at the four queues in Manager under **Queues**.

`q.order.events` is **exclusive**: one consumer receives every message, in
order. That is the right choice when sequence matters.

`q.payment.requests` is **non-exclusive**: messages are shared across every
consumer bound to it, so throughput scales with the number of consumers and
strict ordering is given up. It also has a **dead message queue** and a
redelivery limit, so a message that cannot be processed moves aside after
three attempts instead of blocking everything behind it.

`q.dead.letter` is where those go. Nothing publishes to it directly.

`q.audit.log` subscribes to `acme/>`, which is everything.

Two things to notice. A queue has **subscriptions**: it is not fed by anyone
addressing it, but by topics it has asked for. And a queue has a **quota**,
so a consumer that stops consuming eventually has consequences.

## Client profiles and ACL profiles

These answer two different questions, and keeping them separate is the point.

A **client profile** answers "what may this client do to the broker?" How
many connections, whether it may use guaranteed messaging, whether it may
create queues of its own. Compare `cp-publisher` (may send guaranteed
messages, may not receive them, may not create endpoints) with `cp-developer`
(may do all three). Neither mentions a topic.

An **ACL profile** answers "which topics may this client touch?" Look at
`acl-order-service`: connect is allowed, publish and subscribe both default
to **disallow**, and then specific paths are opened. Default-deny with
explicit exceptions is the pattern worth copying.

`acl-analytics` inverts one of them: subscribe defaults to allow, with an
exception carved out for `acme/payment/>`. Same mechanism, opposite posture.

A **client username** joins one of each together.

## Break it

Once the configuration is applied, scroll to **Break it** in the cockpit. Each
card causes one failure on purpose. Press **Break it**, read the app's output
and what the card tells you to look for, then press **Reset**. The card stays
open after the reset so you can see the recovery, and **Why this breaks**
explains the cause and where you would meet it in production.

1. **Terraform loses its state.** Terraform's state file is deleted, then
   apply runs again against a broker that still has everything.
2. **Someone deletes a queue by hand.** q.order.events is deleted straight
   from the broker, behind terraform's back, then Preview changes runs.

## Try this

- Open `svc-legacy-import`. It is disabled on purpose. Disabling a username
  is how you revoke access without deleting configuration.
- Delete `q.audit.log` in Manager, then press Play again. Terraform compares
  the broker against its state and recreates it. That is not a failure mode,
  it is the tool working.

Next: [Publish and subscribe](20-pub-sub.md).
