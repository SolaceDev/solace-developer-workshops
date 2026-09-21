output "queues" {
  description = "The partitioned absorber and the passenger app's own queue"
  value = [
    solacebroker_msg_vpn_queue.scans.queue_name,
    solacebroker_msg_vpn_queue.status.queue_name,
  ]
}
