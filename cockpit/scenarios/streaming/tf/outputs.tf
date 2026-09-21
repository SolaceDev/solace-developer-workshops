output "queues" {
  description = "The fraud detector's inbox"
  value       = [solacebroker_msg_vpn_queue.fraud.queue_name]
}
