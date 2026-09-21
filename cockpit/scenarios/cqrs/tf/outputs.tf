output "command_queues" {
  description = "One inbox per gateway, holding commands until the device connects"
  value       = sort([for q in solacebroker_msg_vpn_queue.commands : q.queue_name])
}
