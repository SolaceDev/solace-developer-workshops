# Exclusive queue

In the last section a subscriber that was away simply missed what was
published. That is fine for live flight status. It is not fine for a
customer's order, which must reach the ERP even if the ERP is down for an
hour, and must be booked in the order it was placed.

A queue fixes the first problem. Making it **exclusive** fixes the second.

Press **Play**. The webshop publishes five orders every two seconds. Two ERP
connectors are bound to the queue.

## Guaranteed messages and a queue

The webshop publishes each order as a **guaranteed** message to a topic like:

```
sonepar/order/placed/v1/lyon-03/SO-100001
```

It still publishes to a topic, not to a queue. The queue `q.excl.erp-orders`
has a **subscription** to `sonepar/order/placed/v1/>`, so the broker stores a
copy of every matching order on it. The broker confirms to the webshop that
it has the order, and deletes it from the queue only when an ERP connector
**acknowledges** it.

## One active, one standby

Open both connector logs, from the diagram or from Step through it.

- Connector A says **ACTIVE** and receives every order.
- Connector B says **STANDBY** and receives nothing.

Both run the same code and are bound to the same queue. The broker sends an
exclusive queue to one consumer at a time, and that is what keeps the orders
in sequence: each line shows `seq=`, and the numbers only ever go up.

Open **Connectors bound to the queue** under **On the broker**. Two flows,
one `active-consumer` and one `inactive`.

## Break it

1. **The active connector stops.** B changes from STANDBY to ACTIVE within a
   second and starts at the next order A did not finish. Compare the end of
   A's log with the start of B's: no gap.
2. **The ERP is offline.** Both connectors stop while the webshop keeps
   going. Refresh **Queues** under **On the broker** and watch the backlog
   grow. After Reset, connector A works through it oldest first.

## Try this

- Stop the webshop, stop both connectors, then start the webshop again for a
  few seconds. The orders wait on the queue with nobody connected. Start a
  connector and they arrive. Compare that with stopping a subscriber in the
  last section.
- Run a third connector from a terminal and check its log says STANDBY:

  ```bash
  bash cockpit/apps/run.sh sonepar consume --role erp-c --user svc-excl-erp \
    --queue q.excl.erp-orders --exclusive --check-order
  ```

Next: [Non-exclusive queue](40-non-exclusive-queue.md).
