network_info = {
  name = "ntier"
  createdby = "Gopi"
  cidr = "192.168.0.0/16"
}
public_subnets = [{
  name = "web1"
  az   = "ap-south-1a"
  cidr = "192.168.0.0/24"
  }, 
  {
  name = "web2"
  az   = "ap-south-1b"
  cidr = "192.168.1.0/24"
  }
]
private_subnet = [{
  name = "db1"
  cidr = "192.168.2.0/24"
  az   = "ap-south-1a"
  }
]
security_group = [ {
  name = "slim"
  description = "for public ip"
} ]
security_group_info = {
  name        = "web"
  description = "rule for web server"
  vpc_id      = ""
  inbound_rules = [{
    cidr        = "0.0.0.0/0"
    port        = 22
    protocol    = "tcp"
    description = "open ssh"
    },
    {
      cidr        = "0.0.0.0/0"
      port        = 80
      protocol    = "tcp"
      description = "open http"
    },
    {
      cidr        = "0.0.0.0/0"
      port        = 5432
      protocol    = "tcp"
      description = "open for in postgers"
    },
    {
      cidr        = "0.0.0.0/0"
      port        = 1337
      protocol    = "tcp"
      description = "open for strapi"
    }
  ]
  outbound_rules   = []
  allow_all_egress = true
}

web_instance_info = {
  name              = "web"
  size              = "t2.micro"
  ami               = "ami-0f58b397bc5c1f2e8"
  subnet_id         = ""
  security_group_id = ""
  key_name          = "slimk"
}
