output "queues" {
  description = "Readings in, price changes out. Compare their message counts."
  value = [
    solacebroker_msg_vpn_queue.pricing.queue_name,
    solacebroker_msg_vpn_queue.labels.queue_name,
  ]
}
