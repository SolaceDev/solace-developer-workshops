# ---------------------------------------------------------------------------
# The ERP order queue
#
# Exclusive: however many connectors bind, the broker delivers to one of them
# at a time. The others wait as standbys and the first of them takes over the
# moment the active one goes away. One reader means orders reach the ERP in
# the order they were placed.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue" "orders" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.excl.erp-orders"

  access_type     = "exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage = 50

  # Ten in flight. Stopping the active connector hands a visible handful to
  # the standby, marked redelivered, rather than one message or hundreds.
  max_delivered_unacked_msgs_per_flow = 10
}

resource "solacebroker_msg_vpn_queue_subscription" "orders" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.orders.queue_name
  subscription_topic = "sonepar/order/placed/v1/>"
}
