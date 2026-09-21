output "publisher_username" {
  value = solacebroker_msg_vpn_client_username.publisher.client_username
}

output "subscriber_usernames" {
  value = [for k, v in solacebroker_msg_vpn_client_username.subscriber : v.client_username]
}

output "client_profile" {
  value = solacebroker_msg_vpn_client_profile.acme_air_direct.client_profile_name
}

output "acl_profiles" {
  value = concat(
    [solacebroker_msg_vpn_acl_profile.ops_publisher.acl_profile_name],
    [for k, v in solacebroker_msg_vpn_acl_profile.subscriber : v.acl_profile_name],
  )
}
