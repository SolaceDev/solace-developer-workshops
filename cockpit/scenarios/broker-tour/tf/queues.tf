# ---------------------------------------------------------------------------
# Queues
#
# Four queues that together tell a story in the broker UI. They are deliberately
# NOT identical: an attendee touring Queues should see that access type, quota,
# and rejection behaviour are per-queue decisions, not broker-wide settings.
# ---------------------------------------------------------------------------

# Exclusive: one consumer gets every message, order is preserved. The default
# access type, and the right choice when sequence matters.
resource "solacebroker_msg_vpn_queue" "order_events" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.order.events"

  access_type     = "exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage = 500 # MB
  respect_ttl_enabled = true
}

# Non-exclusive: messages are distributed across all bound consumers, so the
# queue scales horizontally at the cost of strict ordering.
resource "solacebroker_msg_vpn_queue" "payment_requests" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.payment.requests"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage  = 1000
  max_redelivery_count = 3

  # Undeliverable messages move aside instead of blocking the queue.
  dead_msg_queue                      = solacebroker_msg_vpn_queue.dead_letter.queue_name
  max_delivered_unacked_msgs_per_flow = 100
}

# Dead message queue. Nothing publishes here directly; it exists to catch what
# payment_requests gives up on after three delivery attempts.
resource "solacebroker_msg_vpn_queue" "dead_letter" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.dead.letter"

  access_type     = "exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage = 200
  respect_ttl_enabled = false # keep failures around for inspection
}

# A deliberately small queue, so the Usage column in the broker UI shows
# something other than 0% once anyone publishes to it.
resource "solacebroker_msg_vpn_queue" "audit_log" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.audit.log"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "read-only"

  max_msg_spool_usage                      = 50
  reject_msg_to_sender_on_discard_behavior = "when-queue-enabled"
}

# ---------------------------------------------------------------------------
# Queue subscriptions
#
# This is the piece that most often clicks for people: a queue is not named by
# a topic. It attracts messages by subscribing to topic patterns, and one queue
# can hold several subscriptions.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue_subscription" "order_created" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.order_events.queue_name
  subscription_topic = "acme/order/created/>"
}

resource "solacebroker_msg_vpn_queue_subscription" "order_updated" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.order_events.queue_name
  subscription_topic = "acme/order/updated/>"
}

resource "solacebroker_msg_vpn_queue_subscription" "order_cancelled" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.order_events.queue_name
  subscription_topic = "acme/order/cancelled/>"
}

# A single-level wildcard: matches acme/payment/requested/visa but not
# acme/payment/requested/visa/recurring. Contrast with > above.
resource "solacebroker_msg_vpn_queue_subscription" "payment_requested" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.payment_requests.queue_name
  subscription_topic = "acme/payment/requested/*"
}

# The audit queue takes everything, which is what makes it a useful contrast
# against the narrowly-scoped queues above.
resource "solacebroker_msg_vpn_queue_subscription" "audit_everything" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.audit_log.queue_name
  subscription_topic = "acme/>"
}
