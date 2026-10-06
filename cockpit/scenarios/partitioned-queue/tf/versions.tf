terraform {
  required_version = ">= 1.5"

  required_providers {
    solacebroker = {
      source  = "registry.terraform.io/solaceproducts/solacebroker"
      version = "~> 1.3"
    }
  }
}

provider "solacebroker" {
  url      = var.solace_url
  username = var.solace_username
  password = var.solace_password
}
