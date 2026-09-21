# ---------------------------------------------------------------------------
# Fan-out
#
# One publisher, four consumers, and nothing in the publisher's configuration
# that names any of them. Two consumers take a direct copy and two take a
# spooled one, so the same single publish is delivered at two different
# qualities of service.
#
# Access control is deliberately permissive here. Pub-sub already teaches ACL
# profiles; repeating that would bury the lesson this scenario is about.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "fanout" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-fanout"

  allow_guaranteed_msg_send_enabled    = true
  allow_guaranteed_msg_receive_enabled = true
  # Queues are terraform's job. An app that could create its own would hide a
  # typo instead of failing on it.
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

# ---------------------------------------------------------------------------
# Queues
#
# The queue is what turns a subscription into a durable one. Loyalty and
# analytics get their copy whether or not they happen to be running, because
# the broker spools it for them. Finance and warehouse subscribe directly and
# see only what is published while they are connected.
# ---------------------------------------------------------------------------

# Loyalty cares about the whole order lifecycle, so its subscription wildcards
# the action and picks up cancellations as well as placements.
resource "solacebroker_msg_vpn_queue" "loyalty" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.fanout.loyalty"

  access_type         = "non-exclusive"
  ingress_enabled     = true
  egress_enabled      = true
  permission          = "consume"
  max_msg_spool_usage = 100
  respect_ttl_enabled = true
}

resource "solacebroker_msg_vpn_queue_subscription" "loyalty" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.loyalty.queue_name
  subscription_topic = "schwarz/grocery/order/*/v1/>"
}

# Analytics is the late arrival: it is not in the Play sequence, so an attendee
# starts it by hand after the others have been running. Its queue has been
# filling the whole time, which is the point.
resource "solacebroker_msg_vpn_queue" "analytics" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.fanout.analytics"

  access_type         = "exclusive"
  ingress_enabled     = true
  egress_enabled      = true
  permission          = "consume"
  max_msg_spool_usage = 100
  respect_ttl_enabled = true
}

resource "solacebroker_msg_vpn_queue_subscription" "analytics" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.analytics.queue_name
  subscription_topic = "schwarz/grocery/>"
}
