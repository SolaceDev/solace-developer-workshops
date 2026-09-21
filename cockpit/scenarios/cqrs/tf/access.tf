# ---------------------------------------------------------------------------
# Command and query
#
# Two directions, configured differently on purpose.
#
# Commands go to a queue, because a command must survive the device being
# offline. Events and telemetry go out as topics with no queue in the middle,
# because the read model wants the current picture and has no use for a
# backlog of stale readings.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "cqrs" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-cqrs"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

resource "solacebroker_msg_vpn_acl_profile" "cqrs" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-cqrs"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "allow"
  subscribe_topic_default_action = "allow"
}

locals {
  cqrs_roles = ["operator", "device", "twin"]

  # One command queue per gateway. A command names a single target, so it
  # gets a queue of its own rather than sharing one and filtering.
  gateways = ["gw4471"]
}

resource "solacebroker_msg_vpn_client_username" "cqrs" {
  for_each = toset(local.cqrs_roles)

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-cqrs-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.cqrs.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.cqrs.acl_profile_name
}

# The device's inbox. It exists whether or not the device is running, which is
# the whole point: a command issued to a gateway that is offline waits here.
resource "solacebroker_msg_vpn_queue" "commands" {
  for_each = toset(local.gateways)

  msg_vpn_name = var.msg_vpn
  queue_name   = "q.cqrs.${each.key}.commands"

  access_type     = "exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage = 50

  # Commands are not retried forever. A device that never comes back should
  # not accumulate an unbounded pile of instructions.
  max_redelivery_count = 5
  respect_ttl_enabled  = true
}

# Only imperative verbs. The past-tense events the device publishes in reply
# must not land back in its own inbox, so the subscription names the commands
# rather than wildcarding the verb.
resource "solacebroker_msg_vpn_queue_subscription" "reboot" {
  for_each = toset(local.gateways)

  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.commands[each.key].queue_name
  subscription_topic = "daimler/connectedVehicle/gateway/reboot/v1/${each.key}"
}

resource "solacebroker_msg_vpn_queue_subscription" "update" {
  for_each = toset(local.gateways)

  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.commands[each.key].queue_name
  subscription_topic = "daimler/connectedVehicle/gateway/update/v1/${each.key}"
}
