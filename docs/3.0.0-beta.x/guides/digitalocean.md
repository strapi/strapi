# DigitalOcean One-click

[DigitalOcean](https://www.digitalocean.com/) provide a simple way to deploy Strapi with an easy click of the mouse.

You can find the image generation [source code](https://github.com/strapi/one-click-deploy/tree/master/digital-ocean) on Strapi's GitHub for more information.

[[toc]]

## Creating the Virtual Machine

### Step 1: Create a DigitalOcean account

If you don't have a DigitalOcean account you will need to create one, you can use [this referral link](https://m.do.co/c/f9d7ce54c165) to get \$100 of free credits!

### Step 2: Create a project

To create a project head over to the Strapi [listing on the marketplace](https://marketplace.digitalocean.com/apps/strapi) and follow these steps:

- Click on `Create Strapi Droplet` button
- Keep the selected Starter - Standard Plan
- Select your virtual machine size (minimum of 2 GB/1 CPU)
- Choose your datacenter (closest to you or your target area)
- Add a new SSH key, if you are on windows you can follow [this guide](https://www.digitalocean.com/docs/droplets/how-to/add-ssh-keys/create-with-putty/)
- Give your virtual machine a hostname
- (optional) Enable backups
- Finally hit Create Droplet!

### Step 4: Visit your app

Please note that it may take anywhere from 30 seconds to a few minutes for the droplet to startup, when it does you should see it in your [droplets list](https://cloud.digitalocean.com/droplets).

From here you will see the public ipv4 address that you can use to visit your Strapi application, just open that in a browser and it should ask you to create your first administrator!

You can also SSH into the virtual machine using `root` as the SSH user and your public ipv4 address, there is no password for SSH as DigitalOcean uses SSH keys by default with password authentication disabled.

## Using the Service Account

## Changing the PostgreSQL Password

## Keeping your Project's Source code in Git

## Migration to Production
