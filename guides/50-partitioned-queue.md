# Partitioned queue

Stock movements arrive from both distribution centres: goods in, picks out,
returns, corrections. The movements for any one SKU must be applied in the
order they happened, or the stock level comes out wrong. But there are
thousands of SKUs, and one consumer working them all in order is too slow.

An exclusive queue keeps order but allows one consumer. A non-exclusive queue
allows many but loses order. A **partitioned** queue gives you both, per key.

Press **Play**. The stock feed publishes 24 movements every three seconds
across twelve SKUs. Two workers share the queue.

## The partition key

Each movement is published with its SKU as the **partition key**, an
ordinary message property set by the publisher:

```go
svc.MessageBuilder().WithProperty(config.QueuePartitionKey, sku)
```

`q.part.stock` has three partitions. The broker hashes each key onto one of
them, so every movement for one SKU lands on the same partition. Each
partition is delivered to exactly one worker at a time.

## Check it

Compare the two worker logs. Each line shows the key and its sequence number.

- No SKU appears in both logs.
- For any one SKU, `seq=` only goes up. A worker would print `OUT OF ORDER`
  if it did not.
- The split is uneven. Keys are hashed onto partitions, not dealt out one at
  a time, so one worker may own seven SKUs and the other five.

Partitioning buys order per key and parallel work across keys. It does not
promise an even share of the work.

## Break it

1. **A stock worker stops.** Its SKUs wait for about five seconds (the
   queue's rebalance delay), then move to worker 2 and carry on from the
   right sequence number.
2. **More workers than partitions.** Workers 3 and 4 join. Three partitions
   can keep three workers busy, so one of the four receives nothing. **Workers
   on the queue** under **On the broker** shows it as `inactive`.

## Try this

- Start worker 3 on its own and watch the broker move one partition to it
  after about five seconds.
- Work out why twelve SKUs and not three. With only three keys, the hash
  could easily put two of them on one partition and leave a worker idle.

Next: [Dead message queue](60-dead-message-queue.md).
