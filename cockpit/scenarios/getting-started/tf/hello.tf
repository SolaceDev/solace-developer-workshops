# ---------------------------------------------------------------------------
# Getting started: the smallest configuration that gives two apps something
# real to run against. One client profile, one ACL profile, two usernames.
#
# Topics: workshop/hello/greeting/v1
# ---------------------------------------------------------------------------

# Direct messaging only. Nothing in this scenario needs a queue.
resource "solacebroker_msg_vpn_client_profile" "hello" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-hello"

  allow_guaranteed_msg_send_enabled        = false
  allow_guaranteed_msg_receive_enabled     = false
  allow_guaranteed_endpoint_create_enabled = false
  allow_transacted_sessions_enabled        = false

  max_connection_count_per_client_username = 10
  max_endpoint_count_per_client_username   = 0
}

# Default-deny with one exception each way, the same posture every later
# scenario uses. The "listen where you are not allowed" failure mode depends
# on anything outside workshop/hello/> being refused.
resource "solacebroker_msg_vpn_acl_profile" "hello" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-hello"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "disallow"
  subscribe_topic_default_action = "disallow"
}

resource "solacebroker_msg_vpn_acl_profile_publish_topic_exception" "hello" {
  msg_vpn_name                   = var.msg_vpn
  acl_profile_name               = solacebroker_msg_vpn_acl_profile.hello.acl_profile_name
  publish_topic_exception        = "workshop/hello/>"
  publish_topic_exception_syntax = "smf"
}

resource "solacebroker_msg_vpn_acl_profile_subscribe_topic_exception" "hello" {
  msg_vpn_name                     = var.msg_vpn
  acl_profile_name                 = solacebroker_msg_vpn_acl_profile.hello.acl_profile_name
  subscribe_topic_exception        = "workshop/hello/>"
  subscribe_topic_exception_syntax = "smf"
}

resource "solacebroker_msg_vpn_client_username" "hello" {
  for_each = toset(["greeter", "listener"])

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-hello-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.hello.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.hello.acl_profile_name
}
