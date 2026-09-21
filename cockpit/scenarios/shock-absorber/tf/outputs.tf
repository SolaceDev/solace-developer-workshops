output "queues" {
  description = "The absorber, its dead message queue, and the partitioned variant"
  value = [
    solacebroker_msg_vpn_queue.scans.queue_name,
    solacebroker_msg_vpn_queue.dmq.queue_name,
    solacebroker_msg_vpn_queue.partitioned.queue_name,
  ]
}

output "partition_count" {
  description = "Partitions on the partitioned queue, one per belt"
  value       = solacebroker_msg_vpn_queue.partitioned.partition_count
}
