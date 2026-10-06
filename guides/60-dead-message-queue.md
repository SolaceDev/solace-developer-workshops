# Dead message queue

Suppliers send price updates for the catalogue, and most of them are fine.
Some are not: a price written as text, an update that waited so long it is
out of date, or one the pricing service keeps failing on because its
database is down.

Retrying those forever blocks the queue. Dropping them loses them. A **dead
message queue** (DMQ) is where the broker puts them instead, so someone can
look.

Press **Play**. The supplier feed publishes one price update a second, and
every seventh has its price written as `"12,40 EUR"` instead of a number.

## Three ways to the DMQ

`q.dmq.prices` names `q.dmq.prices.dead` as its dead message queue. A message
moves there in one of three ways:

| How | Who decides | Setting |
| --- | --- | --- |
| The consumer settles it **REJECTED** | The consumer: this can never succeed | Settlement outcome in the app |
| It is settled **FAILED** too many times | The broker, after the last redelivery | `max_redelivery_count` (3 here) |
| Its **time to live** runs out on the queue | The broker | TTL on the message, `respect_ttl_enabled` on the queue |

A DMQ is an ordinary queue. Nothing is published to it and it has no
subscription; messages reach it only from the queue that names it.

## Rejected

Open the pricing service log. Every seventh update ends:

```
REJECTED -> dead message queue: json: cannot unmarshal string into Go struct field .priceEur of type float64
```

The pricing service cannot use a price it cannot read, and trying again will
not change that, so it settles the update REJECTED. Open **Messages in the
dead message queue** under **On the broker** to see them arrive.

Start **the operations reader** to read them. It prints each one in full. It
also acknowledges them, so reading the DMQ empties it.

## Break it

1. **The pricing database is down.** The pricing service settles every update
   FAILED. Each one is delivered four times (the first delivery plus three
   redeliveries), then moves to the DMQ.
2. **Price updates expire.** The pricing service stops. Each update was
   published with a fifteen second time to live, so after fifteen seconds on
   the queue the broker moves it to the DMQ. When pricing starts again it
   gets only the fresh ones.

**Queues** under **On the broker** has a counter for each route:
`maxRedeliveryExceededToDmqMsgCount` and `maxTtlExpiredToDmqMsgCount`.

## Try this

- Stop the feed, start the operations reader, and read what is in the DMQ.
  Which of the three routes did each message take? The payload is a clue.
- Look at the DMQ's settings in Solace Broker Manager. It ignores time to
  live itself, so a message that expired once does not expire again while
  waiting there.

Next: [Cleanup](99-cleanup.md).
