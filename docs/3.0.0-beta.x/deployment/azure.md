# Azure

This is a step-by-step guide for deploying a Strapi project to [Azure](https://azure.microsoft.com/en-us/). Databases can be on a [Azure Virtual Machine](https://azure.microsoft.com/en-us/services/virtual-machines/), hosted externally as a service, or via the [Azure Managed Databases](https://azure.microsoft.com/en-us/services/postgresql/). Prior to starting this guide, you should have created a [Strapi project](../getting-started/quick-start.md). And have read through the [configuration](../getting-started/deployment.md#configuration) section.

### Azure Install Requirements

- You must have an [Azure account](https://azure.microsoft.com/en-us/free/) before doing these steps.
- An SSH key to access the virtual machine

### Create a Virtual Machine

You will want to use an Azure Virtual Machine for Strapi deployments, the Azure web-app (IIS) deployments are not recommended.

#### 1. Log in to your [Azure Portal](https://portal.azure.com/#home).

#### 2. Create a VM by clicking on `Create a resource`.

#### 3. Basics

Virtual machines are listed under the `Compute` category. You will need the following options:

Project Details:

- Subscription: Can be left as the default
- Resource Group: If you have none, simply hit `Create new`

Instance Details:

- Virtual machine name: This name is used as a resource identifier and the VM's hostname so try to keep it simple
- Region: Select the nearest region to you, or your target area
- Availability options: Leave as default
- Image: Ubuntu Server 18.04 LTS
- Azure Spot instance: No
- Size: B1ms (1vCPU / 2 GiB of Ram) is the recommended minimum as you need at least 2 GiB of RAM to build the Admin panel

Administrator Account:

- Authentication type: It's recommended you use `SSH public key`
- Username: This is the SSH user, it can be set to whatever you like except `root`

Inbound port rules:

More configuration for this will be done when we get to the `Networking` tab of the VM creation for now just leave these as the defaults.

#### 4. Disks

It is entirely up to you which OS Disk type you use, for the cheapest option you should select `Standard HDD` with no encryption. You can also add additional disks to the virtual machine if you need additional space (such as for uploads).

#### 5. Networking

For the networking configuration you will want to leave the following as defaults:

- Virtual network
- Subnet
- Public IP
- Accelerated networking
- Load Balancing (off/no)

However for the NIC network security group we will want to slect `Advanced` and `Create New`. You can name this whatever you like but for inbound rules we want to allow:

- SSH (TCP/22) - Already on be default
- HTTPS (Any/443)
- HTTP (Any/80)
- Strapi (Any/1337)

For each of the ports to allow, you will hit create new and enter the following information:

- Source: Any
- Source port ranges: `*`
- Destination: Any
- Destination port ranges: The port from above (80, 443, or 1337)
- Protocol: Any
- Action: Allow
- Priority: This should be auto-filled for you
- Name: something to easily describe this rule such as `HTTPS_Port` or `Strapi_Port`

#### 6. Management

Entirely optional but you can enable the `OS guest diagnostics` to configure alerting later on, everything else on this tab is also entirely optional. For now let's leave everything as the default options.

#### 7. Advanced

If you are familiar with standard Linux `Cloud init` you are welcome to add in any configuration script to jump-start your virtual machine with some pre-configured packages, however we will leave everything here as default.

#### 8. Tags, Review + Create

You are welcome to tag this virtual machine to easily identify it and others part of your "Project" later on.

Finally review you configuration and wait for Azure to validate the configuration, on this page you will also see the price of your VM per hour. This price will vary based on the region and size of virtual machine you selected (along with any additional options).

Once you have finished verifying your config hit the `Create` button. It may take a few minutes for your deployment to complete, you will see a log of the deployment on the next page. When it's finished you will see `Your deployment is complete`, simply hit `Go to resource`.

### Logging in and installing Strapi dependencies

These next steps will help you set up a production server and setup a non-root service account for managing your Strapi instance. You will need the administrator account you created previously and the public IP listed on your resource page.

#### 1. SSH to your Administrator account created previously
