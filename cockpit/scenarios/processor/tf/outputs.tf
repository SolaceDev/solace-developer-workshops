output "queues" {
  description = "One inbox per pipeline stage"
  value = [
    solacebroker_msg_vpn_queue.assembly.queue_name,
    solacebroker_msg_vpn_queue.router.queue_name,
  ]
}
