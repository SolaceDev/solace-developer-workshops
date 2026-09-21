# ---------------------------------------------------------------------------
# Acme Air -- publish/subscribe access control
#
# One client profile shared by everything, and a separate ACL profile per role.
# That split is the point of the scenario: capability (what a client may do to
# the broker) is a different question from authority (which topics it may
# touch), and here four clients share one capability set while each gets its
# own topic authority.
#
# Topics follow acme/air/<domain>/<event>/<version>/<key>:
#   acme/air/flight/departed/v1/{flight}
#   acme/air/baggage/loaded/v1/{flight}
#   acme/air/booking/confirmed/v1/{record}
# ---------------------------------------------------------------------------

# All four clients assume this one profile. Direct messaging only -- no
# guaranteed send or receive, no endpoint creation -- because this scenario is
# about topics and subscriptions, not about queues.
resource "solacebroker_msg_vpn_client_profile" "acme_air_direct" {
  msg_vpn_name        = var.msg_vpn
  client_profile_name = "cp-acme-air-direct"

  allow_guaranteed_msg_send_enabled        = false
  allow_guaranteed_msg_receive_enabled     = false
  allow_guaranteed_endpoint_create_enabled = false
  allow_transacted_sessions_enabled        = false

  max_connection_count_per_client_username = 10
  max_endpoint_count_per_client_username   = 0
}

# ---------------------------------------------------------------------------
# Publisher: may publish across every Acme Air domain, may subscribe to nothing.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_acl_profile" "ops_publisher" {
  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-acme-air-publisher"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "disallow"
  subscribe_topic_default_action = "disallow"
}

resource "solacebroker_msg_vpn_acl_profile_publish_topic_exception" "ops_publish" {
  msg_vpn_name                   = var.msg_vpn
  acl_profile_name               = solacebroker_msg_vpn_acl_profile.ops_publisher.acl_profile_name
  publish_topic_exception        = "acme/air/>"
  publish_topic_exception_syntax = "smf"
}

# ---------------------------------------------------------------------------
# Subscribers: each may subscribe to exactly one domain and publish nothing.
#
# Deliberately narrow. The flight-ops service cannot read booking records, and
# the booking service cannot see baggage movements, even though all three are
# connected to the same broker with the same client profile.
# ---------------------------------------------------------------------------

locals {
  # role => the one topic pattern that role is allowed to subscribe to.
  #
  # The first three take a whole domain with a multi-level wildcard. Audit
  # takes the other shape: two single-level wildcards and a fixed key, which
  # reads as "every domain and every action, but only for flight AC8763".
  # Having both on screen at once is what makes the difference between > and *
  # concrete rather than a bullet point in a slide.
  subscribers = {
    flight-ops = "acme/air/flight/>"
    baggage    = "acme/air/baggage/>"
    booking    = "acme/air/booking/>"
    audit      = "acme/air/*/*/v1/AC8763"
  }
}

resource "solacebroker_msg_vpn_acl_profile" "subscriber" {
  for_each = local.subscribers

  msg_vpn_name     = var.msg_vpn
  acl_profile_name = "acl-acme-air-${each.key}"

  client_connect_default_action  = "allow"
  publish_topic_default_action   = "disallow"
  subscribe_topic_default_action = "disallow"
}

resource "solacebroker_msg_vpn_acl_profile_subscribe_topic_exception" "subscriber" {
  for_each = local.subscribers

  msg_vpn_name                     = var.msg_vpn
  acl_profile_name                 = solacebroker_msg_vpn_acl_profile.subscriber[each.key].acl_profile_name
  subscribe_topic_exception        = each.value
  subscribe_topic_exception_syntax = "smf"
}

# ---------------------------------------------------------------------------
# Client usernames
#
# The join: every username points at the same client profile, but at its own
# ACL profile. Same capabilities, different topic authority.
# ---------------------------------------------------------------------------

resource "solacebroker_msg_vpn_client_username" "publisher" {
  msg_vpn_name    = var.msg_vpn
  client_username = "svc-acme-air-publisher"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.acme_air_direct.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.ops_publisher.acl_profile_name
}

resource "solacebroker_msg_vpn_client_username" "subscriber" {
  for_each = local.subscribers

  msg_vpn_name    = var.msg_vpn
  client_username = "svc-acme-air-${each.key}"
  password        = var.client_password
  enabled         = true

  client_profile_name = solacebroker_msg_vpn_client_profile.acme_air_direct.client_profile_name
  acl_profile_name    = solacebroker_msg_vpn_acl_profile.subscriber[each.key].acl_profile_name
}
