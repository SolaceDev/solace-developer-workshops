# The cockpit supplies all four of these through TF_VAR_* environment
# variables, so an attendee never has to edit a .tfvars file or answer a
# terraform prompt. See cockpit/app/config.py:terraform_env.

variable "solace_url" {
  description = "Base URL of the broker's SEMP service, e.g. http://localhost:8080"
  type        = string
  default     = "http://localhost:8080"
}

variable "solace_username" {
  description = "Broker management username"
  type        = string
  default     = "admin"
}

variable "solace_password" {
  description = "Broker management password"
  type        = string
  default     = "admin"
  sensitive   = true
}

variable "msg_vpn" {
  description = "Message VPN to configure"
  type        = string
  default     = "default"
}

variable "client_password" {
  description = "Password shared by the workshop client usernames"
  type        = string
  # Matches SOLACE_CLIENT_PASSWORD in cockpit/app/config.py. The cockpit passes
  # both from one value, so they cannot drift apart; this default only applies
  # when terraform is run by hand outside the cockpit.
  default     = "solace-workshop"
  sensitive   = true
}
