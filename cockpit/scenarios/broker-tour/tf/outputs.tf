output "queues" {
  description = "Queues created by this scenario"
  value = [
    solacebroker_msg_vpn_queue.order_events.queue_name,
    solacebroker_msg_vpn_queue.payment_requests.queue_name,
    solacebroker_msg_vpn_queue.dead_letter.queue_name,
    solacebroker_msg_vpn_queue.audit_log.queue_name,
  ]
}

output "client_profiles" {
  value = [
    solacebroker_msg_vpn_client_profile.publisher.client_profile_name,
    solacebroker_msg_vpn_client_profile.consumer.client_profile_name,
    solacebroker_msg_vpn_client_profile.developer.client_profile_name,
  ]
}

output "acl_profiles" {
  value = [
    solacebroker_msg_vpn_acl_profile.order_service.acl_profile_name,
    solacebroker_msg_vpn_acl_profile.analytics.acl_profile_name,
  ]
}

output "client_usernames" {
  value = [
    solacebroker_msg_vpn_client_username.order_service.client_username,
    solacebroker_msg_vpn_client_username.payment_worker.client_username,
    solacebroker_msg_vpn_client_username.analytics.client_username,
    solacebroker_msg_vpn_client_username.legacy.client_username,
  ]
}
