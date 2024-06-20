resource "aws_vpc" "network" {
  cidr_block = var.network_info.cidr
  tags = {
    Name      = var.network_info.name
    createdby = var.network_info.createdby
  }
}

resource "aws_subnet" "web" {
  count             = length(var.public_subnets)
  cidr_block        = var.public_subnets[count.index].cidr
  vpc_id            = aws_vpc.network.id
  availability_zone = var.public_subnets[count.index].az
  tags = {
    Name = var.public_subnets[count.index].name
  }
}
resource "aws_subnet" "web2" {
  count             = length(var.private_subnet)
  cidr_block        = var.private_subnet[count.index].cidr
  vpc_id            = aws_vpc.network.id
  availability_zone = var.private_subnet[count.index].az
  tags = {
    Name = var.private_subnet[count.index].name
  }
}
resource "aws_security_group" "all" {
  vpc_id = aws_vpc.network.id

}

resource "aws_vpc_security_group_ingress_rule" "all" {
  security_group_id = aws_security_group.all.id

  count = length(var.security_group_info.inbound_rules)

  cidr_ipv4   = var.security_group_info.inbound_rules[count.index].cidr
  from_port   = var.security_group_info.inbound_rules[count.index].port
  ip_protocol = var.security_group_info.inbound_rules[count.index].protocol
  to_port     = var.security_group_info.inbound_rules[count.index].port
  description = var.security_group_info.inbound_rules[count.index].description
}
resource "aws_vpc_security_group_ingress_rule" "allow" {
  security_group_id = aws_security_group.all.id

  count = length(var.security_group_info.outbound_rules)

  cidr_ipv4   = var.security_group_info.outbound_rules[count.index].cidr
  from_port   = var.security_group_info.outbound_rules[count.index].from_port
  ip_protocol = var.security_group_info.outbound_rules[count.index].protocol
  to_port     = var.security_group_info.outbound_rules[count.index].to_port
}
resource "aws_internet_gateway" "slim" {
  vpc_id = aws_vpc.network.id

  tags = {
    Name = "main"
  }
  depends_on = [aws_vpc.network]
}
resource "aws_route_table" "test" {
  vpc_id = aws_vpc.network.id
  tags = {
    Name = "public"
  }
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.slim.id
  }
  depends_on = [aws_vpc.network,
  aws_internet_gateway.slim]
}
resource "aws_route_table_association" "public" {
  count          = length(var.public_subnets)
  subnet_id      = aws_subnet.web[count.index].id
  route_table_id = aws_route_table.test.id
  depends_on = [aws_vpc.network,
  aws_route_table.test]
}
resource "aws_instance" "slim" {
  ami                         = var.web_instance_info.ami
  instance_type               = "t2.micro"
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.all.id]
  subnet_id                   = aws_subnet.web[0].id
  key_name                    = var.web_instance_info.key_name

  depends_on = [aws_subnet.web, aws_security_group.all]

   provisioner "remote-exec" {
    script = "install.sh"
   }


}
