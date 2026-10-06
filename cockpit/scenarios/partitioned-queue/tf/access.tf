# ---------------------------------------------------------------------------
# Partitioned queue: stock movements in order per SKU, in parallel across SKUs.
#
# Access control for this section. Topics: sonepar/inventory/>
# ---------------------------------------------------------------------------

# Guaranteed messaging on, and no endpoint creation: the queue is terraform's
# job, so an app that tries to create its own fails instead of quietly making
# an object nobody manages.
resource "solacebroker_msg_vpn_client_profile" "part" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-part"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

# Publishing is limited to this section's own topic tree. Consumers read a
# queue rather than subscribing to topics, so no subscribe exception is needed.
resource "solacebroker_msg_vpn_acl_profile" "part" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-part"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "disallow"
  subscribe_topic_default_action = "disallow"
}

resource "solacebroker_msg_vpn_acl_profile_publish_topic_exception" "part" {
  msg_vpn_name                   = var.msg_vpn
  acl_profile_name               = solacebroker_msg_vpn_acl_profile.part.acl_profile_name
  publish_topic_exception        = "sonepar/inventory/>"
  publish_topic_exception_syntax = "smf"
}

resource "solacebroker_msg_vpn_client_username" "part" {
  for_each = toset(["stock-feed", "stock-worker"])

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-part-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.part.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.part.acl_profile_name
}
