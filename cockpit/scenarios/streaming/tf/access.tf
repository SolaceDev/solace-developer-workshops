# ---------------------------------------------------------------------------
# Streaming
#
# A continuous flow of payment authorizations, with a rule applied to it in
# motion. The fraud detector reads from a queue so nothing is missed while it
# restarts; the regional watcher subscribes directly, because it wants what is
# happening now rather than a backlog.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "streaming" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-streaming"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

resource "solacebroker_msg_vpn_acl_profile" "streaming" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-streaming"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "allow"
  subscribe_topic_default_action = "allow"
}

locals {
  streaming_roles = ["gateway", "fraud", "watch"]
}

resource "solacebroker_msg_vpn_client_username" "streaming" {
  for_each = toset(local.streaming_roles)

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-streaming-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.streaming.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.streaming.acl_profile_name
}

# Non-exclusive, so a second detector can be started alongside the first.
# Note what that costs: the rolling window lives in each instance's memory, so
# two instances each see part of the stream and neither has the whole picture
# for a card. Partitioning by card is the fix, and the shock absorber scenario
# shows how. Worth trying here to see the problem first.
resource "solacebroker_msg_vpn_queue" "fraud" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.streaming.fraud"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage = 100

  # The rule is about what is happening now. An authorization that has sat
  # here for five minutes has outlived the decision it was meant to inform,
  # so let it expire rather than process it late.
  respect_ttl_enabled = true
  max_ttl             = 300
}

resource "solacebroker_msg_vpn_queue_subscription" "fraud" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.fraud.queue_name
  subscription_topic = "united/booking/payment/authorized/v1/>"
}
