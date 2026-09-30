output "usernames" {
  description = "Client usernames created for this scenario"
  value       = sort([for u in solacebroker_msg_vpn_client_username.fanout : u.client_username])
}
