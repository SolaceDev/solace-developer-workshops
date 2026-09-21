# ---------------------------------------------------------------------------
# Shock absorber
#
# A queue between a fast producer and slower consumers. Three things are set
# up here, each for a different part of the lesson:
#
#   q.shock.scans              one shared queue, several workers competing
#   q.shock.dmq                where messages go after too many attempts
#   q.shock.scans.partitioned  ordered per key, parallel across keys
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "shock" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-shock"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

resource "solacebroker_msg_vpn_acl_profile" "shock" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-shock"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "allow"
  subscribe_topic_default_action = "allow"
}

locals {
  shock_roles = ["scanner", "worker", "partition-worker"]
}

resource "solacebroker_msg_vpn_client_username" "shock" {
  for_each = toset(local.shock_roles)

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-shock-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.shock.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.shock.acl_profile_name
}

# ---------------------------------------------------------------------------
# The absorber itself
#
# Non-exclusive, so every worker bound to it takes a share. The interesting
# settings are the three that decide what happens when a worker cannot cope:
#
#   max_delivered_unacked_msgs_per_flow  how much one worker holds in flight,
#                                        and therefore how much comes back if
#                                        it stops mid-burst
#   max_redelivery_count                 how many attempts before giving up
#   dead_msg_queue                       where it gives up to
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue" "scans" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.shock.scans"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  # Small on purpose. A burst of 200 against a 50 MB quota would never fill
  # it, and a quota that is never reached teaches nothing; this one can be
  # pushed to its limit in a workshop.
  max_msg_spool_usage = 50

  # Ten in flight per worker. Low enough that stopping a worker returns a
  # visible handful of messages rather than one, and low enough to read.
  max_delivered_unacked_msgs_per_flow = 10

  max_redelivery_count = 3
  dead_msg_queue       = solacebroker_msg_vpn_queue.dmq.queue_name
  respect_ttl_enabled  = true
}

resource "solacebroker_msg_vpn_queue_subscription" "scans" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.scans.queue_name
  subscription_topic = "acme/air/baggage/scanned/v1/>"
}

# Nothing publishes here directly. It exists to catch what q.shock.scans gives
# up on, so a poison message moves aside instead of blocking the queue behind it.
resource "solacebroker_msg_vpn_queue" "dmq" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.shock.dmq"

  access_type          = "exclusive"
  ingress_enabled      = true
  egress_enabled       = true
  permission           = "consume"
  max_msg_spool_usage  = 50
  respect_ttl_enabled  = false
}

# ---------------------------------------------------------------------------
# The partitioned queue
#
# Competing consumers scale throughput but give up ordering: two workers on
# one queue can process two scans from the same belt at the same time, in
# either order. Partitioning restores order per key without giving up the
# parallelism: each partition goes to exactly one consumer, and the broker
# reassigns partitions as consumers come and go.
#
# Three partitions and three belts, so an attendee running two workers can see
# one of them own two belts.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue" "partitioned" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.shock.scans.partitioned"

  access_type     = "non-exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  partition_count = 3
  # Short, so rebalancing after a worker starts or stops happens while the
  # attendee is still looking at the screen rather than a minute later.
  partition_rebalance_delay            = 5
  partition_rebalance_max_handoff_time = 3

  max_msg_spool_usage                 = 50
  max_delivered_unacked_msgs_per_flow = 10
  respect_ttl_enabled                 = true
}

resource "solacebroker_msg_vpn_queue_subscription" "partitioned" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.partitioned.queue_name
  subscription_topic = "acme/air/baggage/scanned/v1/>"
}
