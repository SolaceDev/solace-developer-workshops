output "queues" {
  description = "Queues holding a durable copy of the order stream"
  value = [
    solacebroker_msg_vpn_queue.loyalty.queue_name,
    solacebroker_msg_vpn_queue.analytics.queue_name,
  ]
}

output "usernames" {
  description = "Client usernames created for this scenario"
  value       = sort([for u in solacebroker_msg_vpn_client_username.fanout : u.client_username])
}
