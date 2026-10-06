# ---------------------------------------------------------------------------
# The price update queue and its dead message queue
#
# Three ways a message leaves q.dmq.prices for q.dmq.prices.dead instead of
# being processed, and each is a setting here or on the message:
#
#   REJECTED by the consumer       it can never be processed
#   max_redelivery_count reached   it was tried and FAILED too many times
#   time to live passed            it waited too long (respect_ttl_enabled)
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue" "prices" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.dmq.prices"

  access_type     = "exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage                 = 50
  max_delivered_unacked_msgs_per_flow = 10

  max_redelivery_count = 3
  respect_ttl_enabled  = true
  dead_msg_queue       = solacebroker_msg_vpn_queue.dead.queue_name
}

resource "solacebroker_msg_vpn_queue_subscription" "prices" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.prices.queue_name
  subscription_topic = "sonepar/catalog/price/updated/v1/>"
}

# An ordinary queue that another queue names as its DMQ. Nothing publishes
# here and it has no subscription. Its own TTL handling is off, so an expired
# price that arrives here stays until someone reads it.
resource "solacebroker_msg_vpn_queue" "dead" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.dmq.prices.dead"

  access_type         = "exclusive"
  ingress_enabled     = true
  egress_enabled      = true
  permission          = "consume"
  max_msg_spool_usage = 50
  respect_ttl_enabled = false
}
