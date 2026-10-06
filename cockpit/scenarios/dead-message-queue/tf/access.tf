# ---------------------------------------------------------------------------
# Dead message queue: supplier price updates that cannot be used are set aside.
#
# Access control for this section. Topics: sonepar/catalog/>
# ---------------------------------------------------------------------------

# Guaranteed messaging on, and no endpoint creation: the queue is terraform's
# job, so an app that tries to create its own fails instead of quietly making
# an object nobody manages.
resource "solacebroker_msg_vpn_client_profile" "dmq" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-dmq"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

# Publishing is limited to this section's own topic tree. Consumers read a
# queue rather than subscribing to topics, so no subscribe exception is needed.
resource "solacebroker_msg_vpn_acl_profile" "dmq" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-dmq"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "disallow"
  subscribe_topic_default_action = "disallow"
}

resource "solacebroker_msg_vpn_acl_profile_publish_topic_exception" "dmq" {
  msg_vpn_name                   = var.msg_vpn
  acl_profile_name               = solacebroker_msg_vpn_acl_profile.dmq.acl_profile_name
  publish_topic_exception        = "sonepar/catalog/>"
  publish_topic_exception_syntax = "smf"
}

resource "solacebroker_msg_vpn_client_username" "dmq" {
  for_each = toset(["price-feed", "pricing", "ops"])

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-dmq-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.dmq.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.dmq.acl_profile_name
}
