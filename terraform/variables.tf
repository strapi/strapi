variable "network_info" {
  type = object({
    name      = string
    createdby = string
    cidr      = string
  })
}
variable "public_subnets" {
  type = list(object({
    name = string,
    cidr = string,
    az   = string
    }
  ))
  description = "the public subnets"
}
variable "private_subnet" {
  type = list(object({
    name = string,
    cidr = string,
    az   = string
    }
  ))
  description = "private_subnet"
}
variable "security_group" {
  type = list(object({
    name        = string,
    description = string
    }
  ))
}
variable "security_group_info" {
  type = object({
    name        = string
    description = string
    vpc_id      = string
    inbound_rules = list(object({
      cidr        = string
      port        = number
      protocol    = string
      description = string
    }))
    outbound_rules = list(object({
      cidr        = string
      from_port   = number
      protocol    = string
      to_port     = number
      description = string
    }))
    allow_all_egress = bool
  })
  description = "security group info"
}
variable "web_instance_info" {
  type = object({
    name              = string
    size              = string
    ami               = string
    subnet_id         = string
    security_group_id = string
    key_name          = string
  })

}
