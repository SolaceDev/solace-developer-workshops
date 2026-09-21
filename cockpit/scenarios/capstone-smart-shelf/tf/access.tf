# ---------------------------------------------------------------------------
# Smart Shelf Pricing
#
# The pricing engine's queue takes three input streams through three
# subscriptions on one queue: scans, stock counts and footfall. One queue
# rather than three because the engine needs all of them to decide a price,
# and a single ordered inbox is simpler than correlating three.
#
# The label queue is separate and carries only actual price changes. The
# difference in message counts between the two queues is the whole point of
# the scenario, and it is visible in Inspect.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_profile" "shelf" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-shelf"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false

  max_connection_count_per_client_username = 20
  max_endpoint_count_per_client_username   = 0
}

resource "solacebroker_msg_vpn_acl_profile" "shelf" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-shelf"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "allow"
  subscribe_topic_default_action = "allow"
}

locals {
  shelf_roles = ["sensors", "pricing", "labels"]

  # The three input streams the pricing engine needs.
  pricing_inputs = {
    scans    = "schwarz/grocery/shelf/scanned/v1/>"
    stock    = "schwarz/grocery/stock/updated/v1/>"
    footfall = "schwarz/grocery/footfall/measured/v1/>"
  }
}

resource "solacebroker_msg_vpn_client_username" "shelf" {
  for_each = toset(local.shelf_roles)

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-shelf-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.shelf.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.shelf.acl_profile_name
}

resource "solacebroker_msg_vpn_queue" "pricing" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.shelf.pricing"

  access_type     = "exclusive"
  ingress_enabled = true
  egress_enabled  = true
  permission      = "consume"

  max_msg_spool_usage = 100

  # Exclusive on purpose. The price view is state held by one consumer, so a
  # second instance would hold a different half of it and both would make
  # decisions from an incomplete picture.
  respect_ttl_enabled = true
}

resource "solacebroker_msg_vpn_queue_subscription" "pricing" {
  for_each = local.pricing_inputs

  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.pricing.queue_name
  subscription_topic = each.value
}

resource "solacebroker_msg_vpn_queue" "labels" {
  msg_vpn_name = var.msg_vpn
  queue_name   = "q.shelf.labels"

  access_type         = "exclusive"
  ingress_enabled     = true
  egress_enabled      = true
  permission          = "consume"
  max_msg_spool_usage = 100
  respect_ttl_enabled = true
}

resource "solacebroker_msg_vpn_queue_subscription" "labels" {
  msg_vpn_name       = var.msg_vpn
  queue_name         = solacebroker_msg_vpn_queue.labels.queue_name
  subscription_topic = "schwarz/grocery/price/updated/v1/>"
}
