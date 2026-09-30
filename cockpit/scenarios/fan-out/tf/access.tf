# ---------------------------------------------------------------------------
# Fan-out
#
# One publisher, four consumers, and nothing in the publisher's configuration
# that names any of them. Every consumer is a direct subscriber, so there are
# no queues here: the broker copies each publish to every matching topic
# subscription, and a consumer sees only what arrives while it is connected.
#
# Access control is deliberately permissive here. Pub-sub already teaches ACL
# profiles; repeating that would bury the lesson this scenario is about.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "fanout" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-fanout"

  # Direct messaging only. Nothing in this scenario is guaranteed, so leaving
  # these off means an app that tried to spool would fail rather than quietly
  # turn the lesson into a different one.
  allow_guaranteed_msg_send_enabled        = false
  allow_guaranteed_msg_receive_enabled     = false
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

resource "solacebroker_msg_vpn_acl_profile" "fanout" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-fanout"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "allow"
  subscribe_topic_default_action = "allow"
}

locals {
  fanout_roles = ["publisher", "finance", "warehouse", "loyalty", "analytics"]
}

resource "solacebroker_msg_vpn_client_username" "fanout" {
  for_each = toset(local.fanout_roles)

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-fanout-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.fanout.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.fanout.acl_profile_name
}

