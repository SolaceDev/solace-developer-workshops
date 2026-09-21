# ---------------------------------------------------------------------------
# Processor
#
# A two-stage pipeline: the enricher adds what downstream needs, the router
# decides a region and puts it in the topic. Each stage reads from its own
# queue, which is what lets a stage be stopped, started or scaled without the
# stages either side noticing.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "processor" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-processor"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

resource "solacebroker_msg_vpn_acl_profile" "processor" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-processor"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "allow"
  subscribe_topic_default_action = "allow"
}

locals {
  processor_roles = ["line", "enricher", "router", "sink"]
}

resource "solacebroker_msg_vpn_client_username" "processor" {
  for_each = toset(local.processor_roles)

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-processor-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.processor.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.processor.acl_profile_name
}

# ---------------------------------------------------------------------------
# One queue per stage
#
# Exclusive, because a pipeline stage here is a single consumer and ordering
# is easier to follow that way. Making one non-exclusive and starting a second
# instance is a reasonable thing to try next; the shock absorber scenario
# covers what that changes.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_queue" "assembly" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.processor.assembly"

  access_type         = "exclusive"
  ingress_enabled     = true
  egress_enabled      = true
  permission          = "consume"
  max_msg_spool_usage = 100
  respect_ttl_enabled = true
}

resource "solacebroker_msg_vpn_queue_subscription" "assembly" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.assembly.queue_name
  subscription_topic = "daimler/manufacturing/assembly/started/v1/>"
}

# Subscribed from the moment Apply runs, whether or not the router is running.
# That is what lets an attendee start the router late and find a backlog
# waiting: the pipeline stage was absent, but its inbox was not.
resource "solacebroker_msg_vpn_queue" "router" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.processor.router"

  access_type         = "exclusive"
  ingress_enabled     = true
  egress_enabled      = true
  permission          = "consume"
  max_msg_spool_usage = 100
  respect_ttl_enabled = true
}

resource "solacebroker_msg_vpn_queue_subscription" "router" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.router.queue_name
  subscription_topic = "daimler/manufacturing/assembly/enriched/v1/>"
}
