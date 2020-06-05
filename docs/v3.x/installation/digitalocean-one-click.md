# DigitalOcean One-click

[DigitalOcean](https://www.digitalocean.com/) provide a simple way to deploy Strapi with an easy click of the mouse.

You can find the image generation [source code](https://github.com/strapi/one-click-deploy/tree/master/digital-ocean) on Strapi's GitHub for more information.

[[toc]]

## Creating the Virtual Machine

### Step 1: Create a DigitalOcean account

If you don't have a DigitalOcean account you will need to create one, you can use [this referral link](https://m.do.co/c/30986c1ff595) to get \$100 of free credits!

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

### Step 3: Visit your app

Please note that it may take anywhere from 30 seconds to a few minutes for the droplet to startup, when it does you should see it in your [droplets list](https://cloud.digitalocean.com/droplets).

::: warning
After the droplet has started, it will take a few more minutes to finish the Strapi installation.
:::

From here you will see the public ipv4 address that you can use to visit your Strapi application, just open that in a browser and it should ask you to create your first administrator!

You can also SSH into the virtual machine using `root` as the SSH user and your public ipv4 address, there is no password for SSH as DigitalOcean uses SSH keys by default with password authentication disabled.

## Default server configuration

From the initial startup you should not need to configure anything to get started, there is some included software that is configured:

- Node.js v12 (installed via the offical [apt repository](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions))
- Yarn Latest Stable (installed via the official [apt repository](https://classic.yarnpkg.com/en/docs/install/#debian-stable))
- Nginx Latest (Ubuntu default repository)
- UFW (Uncomplicated Firewall)
  - Configured to only allow incoming ports: 80 (HTTP), 443 (HTTPS), and 22 (SSH)
- PostgreSQL Latest (Ubuntu default repository)
- PM2 (Installed globally using Yarn)

## File and Software paths

### Nginx

The DigitalOcean one-click application uses Nginx to proxy http on port 80 to Strapi, this is to ensure the system is secure as running any application on ports below 1024 require root permissions.

The example config included by default is located at `/etc/nginx/sites-available/strapi.conf` and the upstream block is located at `/etc/nginx/conf.d/upstream.conf`

To learn more about the Nginx proxy options you can view the Nginx proxy [documentation](http://nginx.org/en/docs/http/ngx_http_proxy_module.html).

:::: tabs

::: tab strapi.conf
Path: `/etc/nginx/sites-available/strapi.conf`

```
server {

# Listen HTTP
    listen 80;
    server_name _;

# Proxy Config
    location / {
        proxy_pass http://strapi;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }
}
```

:::

::: tab upstream.conf
Path: `/etc/nginx/conf.d/upstream.conf`

```
upstream strapi {
    server 127.0.0.1:1337;
}
```

:::

::::

### Strapi

In the DigitalOcean one-click application a service user is used in which it's home directory is located at `/srv/strapi`. Likewise the actual Strapi application is located within this home directory at `/srv/strapi/strapi-development`.

Please note that with this application it is initially created and ran in the `development` environment to allow for creating models. **You should not use this directly in production**, it is recommended that you configure a private git repository to commit changes into and create a new application directory within the service user's home (Example: `/srv/strapi/strapi-production`). To run the new `production` or `staging` environments you can refer to the [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/#managing-processes).

## Using the Service Account

By default the Strapi application will be running under a "service account", this is an account that is extremely limited into what it can do and access. The purpose of using a service account is to help protect your system from security threats.

### Accessing the service account

The first step in accessing your service account is to SSH into the root user, depending on your Operating System or your SSH client there may be multiple ways to do this. You should refer to your SSH clients documentation for clarification on using SSH keys.

After you have successfully logged into the root user you can now run `sudo su strapi` and this will take you to the `strapi` user's shell. To go back to the root user simply run `exit`.

::: warning
Please note that by default the `strapi` user **cannot run sudo commands** this is intended!
:::

### Controlling the Strapi service and viewing logs

Once you are in the Strapi service account you can now use [PM2](https://pm2.keymetrics.io/docs/usage/quick-start/#managing-processes) to manage the Strapi process and view the logs.

The default service is called `strapi-development` and should be running with an ID of `0`. Below are some example commands for PM2:

```bash
pm2 list # Will show you a list of all running processes
pm2 restart strapi-development # Restart the Strapi process manually
pm2 stop strapi-development # Stop the Strapi process
pm2 start strapi-development # Start the Strapi process
pm2 logs strapi-development # Show the logs in real time (to exit use ctrl +c)
```

Strapi will automatically start if the virtual machine is rebooted, you can also manually view the log files under `/srv/strapi/.pm2/logs` if you encounter any errors during the bootup.

## Changing the PostgreSQL Password

Use the following steps to change the PostgreSQL password and update Strapi's config:

- Make sure you are logged into the `strapi` service user
- Stop the current strapi process and change the password for the `strapi` database user

```bash
pm2 stop strapi-development
psql -c "ALTER USER strapi with password 'your-new-password';"
```

- Update the `/srv/strapi/strapi/config/.env` file with the new password.

```
DATABASE_PASSWORD=your-new-password
```

- Restart Strapi and confirm the password change was successful

```bash
pm2 start strapi-development
pm2 logs strapi-development
```
