# ---------------------------------------------------------------------------
# The pick task queue
#
# Non-exclusive: every picker bound to it takes a share, so adding pickers
# drains a backlog faster with no other change.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue" "picks" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.shared.pick-tasks"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  # 1 MB, small on purpose. The order wave never comes near it, but the
  # "queue fills up" failure mode can reach it in seconds, and a quota that
  # is never reached teaches nothing.
  max_msg_spool_usage = 1

  # Tell the publisher when a message is discarded, instead of dropping it
  # silently. This is what turns a full queue into an error the publisher
  # can see.
  reject_msg_to_sender_on_discard_behavior = "when-queue-enabled"

  # Ten in flight per picker, so stopping one returns a readable handful.
  max_delivered_unacked_msgs_per_flow = 10
}

resource "solacebroker_msg_vpn_queue_subscription" "picks" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.picks.queue_name
  subscription_topic = "sonepar/warehouse/pick/requested/v1/>"
}
