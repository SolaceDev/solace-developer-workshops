# ---------------------------------------------------------------------------
# Client Profiles
#
# A client profile answers "what is this client allowed to do to the broker?"
# -- connection limits, whether it may create endpoints, whether it may use
# guaranteed messaging. It is about capability and resource limits, not topics.
# ---------------------------------------------------------------------------

# A restrictive profile for applications that only publish. No endpoint
# creation, no guaranteed messaging: they fire events and move on.
resource "solacebroker_msg_vpn_client_profile" "publisher" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-publisher"

  allow_guaranteed_msg_send_enabled        = true
  allow_guaranteed_msg_receive_enabled     = false
  allow_guaranteed_endpoint_create_enabled = false
  allow_transacted_sessions_enabled        = false

  max_connection_count_per_client_username = 10
  max_endpoint_count_per_client_username   = 0
}

# Consumers need to receive guaranteed messages and bind to queues, but still
# should not be creating endpoints on the fly in a governed environment.
resource "solacebroker_msg_vpn_client_profile" "consumer" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-consumer"

  allow_guaranteed_msg_send_enabled        = false
  allow_guaranteed_msg_receive_enabled     = true
  allow_guaranteed_endpoint_create_enabled = false
  allow_transacted_sessions_enabled        = true

  max_connection_count_per_client_username = 50
  max_endpoint_count_per_client_username   = 0
}

# The permissive profile, for local development. Worth showing next to the two
# above precisely because the contrast is the lesson.
resource "solacebroker_msg_vpn_client_profile" "developer" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-developer"

  allow_guaranteed_msg_send_enabled           = true
  allow_guaranteed_msg_receive_enabled        = true
  allow_guaranteed_endpoint_create_enabled    = true
  allow_guaranteed_endpoint_create_durability = "all"
  allow_transacted_sessions_enabled           = true

  max_connection_count_per_client_username = 100
  max_endpoint_count_per_client_username   = 50
}

# ---------------------------------------------------------------------------
# ACL Profiles
#
# An ACL profile answers the other question: "which topics may this client
# touch?" Default-deny with explicit exceptions is the pattern worth teaching,
# so both publish and subscribe default to disallow and we open specific paths.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_acl_profile" "order_service" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-order-service"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "disallow"
  subscribe_topic_default_action = "disallow"
}

# The order service publishes order lifecycle events and nothing else.
resource "solacebroker_msg_vpn_acl_profile_publish_topic_exception" "order_publish" {
  msg_vpn_name                   = var.msg_vpn
  acl_profile_name               = solacebroker_msg_vpn_acl_profile.order_service.acl_profile_name
  publish_topic_exception        = "acme/order/>"
  publish_topic_exception_syntax = "smf"
}

# It listens for payment outcomes so it can advance the order state machine.
resource "solacebroker_msg_vpn_acl_profile_subscribe_topic_exception" "order_subscribe" {
  msg_vpn_name                     = var.msg_vpn
  acl_profile_name                 = solacebroker_msg_vpn_acl_profile.order_service.acl_profile_name
  subscribe_topic_exception        = "acme/payment/completed/>"
  subscribe_topic_exception_syntax = "smf"
}

# A read-only profile: may subscribe broadly, may publish nothing at all.
# This is the clearest demonstration of the two defaults acting independently.
resource "solacebroker_msg_vpn_acl_profile" "analytics" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-analytics"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "disallow"
  subscribe_topic_default_action = "allow"
}

# Even with subscribe defaulting to allow, we carve out an exception: the
# analytics tier must not see raw payment traffic.
resource "solacebroker_msg_vpn_acl_profile_subscribe_topic_exception" "analytics_no_payments" {
  msg_vpn_name                     = var.msg_vpn
  acl_profile_name                 = solacebroker_msg_vpn_acl_profile.analytics.acl_profile_name
  subscribe_topic_exception        = "acme/payment/>"
  subscribe_topic_exception_syntax = "smf"
}

# ---------------------------------------------------------------------------
# Client Usernames
#
# The join point: a username binds one client profile to one ACL profile.
# Capability and topic authority are configured separately and combined here.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_username" "order_service" {
  msg_vpn_name    = var.msg_vpn
  client_username = "svc-order"
  password        = "workshop-demo"
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.publisher.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.order_service.acl_profile_name
}

resource "solacebroker_msg_vpn_client_username" "payment_worker" {
  msg_vpn_name    = var.msg_vpn
  client_username = "svc-payment"
  password        = "workshop-demo"
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.consumer.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.order_service.acl_profile_name
}

resource "solacebroker_msg_vpn_client_username" "analytics" {
  msg_vpn_name    = var.msg_vpn
  client_username = "svc-analytics"
  password        = "workshop-demo"
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.consumer.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.analytics.acl_profile_name
}

# Disabled on purpose. An attendee touring Client Usernames should see that
# "enabled" is a real switch, and that a disabled username is how you revoke
# access without deleting configuration.
resource "solacebroker_msg_vpn_client_username" "legacy" {
  msg_vpn_name    = var.msg_vpn
  client_username = "svc-legacy-import"
  password        = "workshop-demo"
  enabled         = false

  client_profile_name = solacebroker_msg_vpn_client_profile.developer.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.analytics.acl_profile_name
}
