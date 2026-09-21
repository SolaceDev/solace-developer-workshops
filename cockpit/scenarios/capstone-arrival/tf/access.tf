# ---------------------------------------------------------------------------
# Surviving the Arrival
#
# Two queues, deliberately separate, and that separation is the scenario.
#
# q.arrival.scans is partitioned by belt and feeds the slow routing work.
# q.arrival.status feeds the passenger app. Because the app has its own
# queue, routing being saturated changes how quickly statuses are produced
# but cannot stop the app consuming the ones that exist. One queue shared
# between them would couple the two, and the passenger-facing service would
# degrade exactly when passengers are looking at it.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "arrival" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-arrival"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

resource "solacebroker_msg_vpn_acl_profile" "arrival" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-arrival"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "allow"
  subscribe_topic_default_action = "allow"
}

locals {
  arrival_roles = ["scanner", "routing", "passenger"]
}

resource "solacebroker_msg_vpn_client_username" "arrival" {
  for_each = toset(local.arrival_roles)

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-arrival-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.arrival.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.arrival.acl_profile_name
}

# The absorber. Partitioned by belt so each belt keeps its scan order while
# the belts are routed in parallel.
resource "solacebroker_msg_vpn_queue" "scans" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.arrival.scans"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  partition_count                      = 3
  partition_rebalance_delay            = 5
  partition_rebalance_max_handoff_time = 3

  max_msg_spool_usage                 = 200
  max_delivered_unacked_msgs_per_flow = 20
  respect_ttl_enabled                 = true
}

resource "solacebroker_msg_vpn_queue_subscription" "scans" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.scans.queue_name
  subscription_topic = "acme/air/baggage/scanned/v1/>"
}

# The passenger app's own queue. Separate from the scan queue on purpose:
# this is the fan-out that keeps a passenger-facing service independent of
# the batch-shaped work happening beside it.
resource "solacebroker_msg_vpn_queue" "status" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.arrival.status"

  access_type         = "exclusive"
  ingress_enabled     = true
  egress_enabled      = true
  permission          = "consume"
  max_msg_spool_usage = 200
  respect_ttl_enabled = true
}

resource "solacebroker_msg_vpn_queue_subscription" "status" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.status.queue_name
  subscription_topic = "acme/air/baggage/status/v1/>"
}
