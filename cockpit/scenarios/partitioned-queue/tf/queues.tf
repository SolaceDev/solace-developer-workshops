# ---------------------------------------------------------------------------
# The stock movement queue
#
# Non-exclusive and partitioned. Each message carries its SKU as a partition
# key, every key maps to one partition, and each partition is delivered to
# exactly one consumer at a time. So movements for one SKU stay in order while
# different SKUs are worked in parallel. The broker reassigns partitions as
# consumers come and go.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue" "stock" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.part.stock"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  partition_count = 3
  # Short, so rebalancing after a consumer starts or stops happens while the
  # attendee is still watching rather than a minute later.
  partition_rebalance_delay            = 5
  partition_rebalance_max_handoff_time = 3

  max_msg_spool_usage                 = 50
  max_delivered_unacked_msgs_per_flow = 10
}

resource "solacebroker_msg_vpn_queue_subscription" "stock" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.stock.queue_name
  subscription_topic = "sonepar/inventory/stock/adjusted/v1/>"
}
