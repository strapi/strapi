# Installing using AWS Marketplace

[Amazon Web Services](https://aws.amazon.com/) provide a simple way to deploy Strapi with an easy click of the mouse.

You can find the image generation [source code](https://github.com/strapi/one-click-deploy/tree/master/aws-ami) on Strapi's GitHub for more information.

[[toc]]

## Creating the Virtual Machine

### Step 1: Create an AWS account

If you don't have a AWS account you will need to [create one](https://portal.aws.amazon.com/billing/signup).

### Step 2: Create a project

To create a project head over to the Strapi [listing on the AWS marketplace](https://replaceme) and follow these steps:

- [TO_DO] - Fill in steps once this is on the marketplace

### Step 3: Configure your instance

[TO_DO] - Need to add specifc configuration steps for AWS

### Step 4: Visit your app

Please note that it may take anywhere from 30 seconds to a few minutes for the instance to startup, when it does you should see it in your instance list.

From here you will see the public ipv4 address that you can use to visit your Strapi application, just open that in a browser and it should ask you to create your first administrator!

You can also SSH into the virtual machine using `ubuntu` as the SSH user and your public ipv4 address, there is no password for SSH as AWS uses SSH keys by default with password authentication disabled.

## Default server configuration

From the inital startup you should not need to configure anything to get started, there is some included software that is configured:

- Node.js v12 (installed via the offical [apt repository](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions))
- Yarn Latest Stable (installed via the official [apt repository](https://classic.yarnpkg.com/en/docs/install/#debian-stable))
- Nginx Latest (Ubuntu default repository)
- UFW (Uncomplicated Firewall)
  - Configured to only allow incoming ports: 80 (HTTP), 443 (HTTPS), and 22 (SSH)
- PostgreSQL Latest (Ubuntu default repository)
- PM2 (Installed globally using Yarn)

## File and Software paths

### Nginx

The AWS one-click application uses Nginx to proxy http on port 80 to Strapi, this is to ensure the system is secure as running any application on ports below 1024 require root permissions.

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

In the AWS one-click application a service user is used in which it's home directory is located at `/srv/strapi`. Likewise the actual Strapi application is located within this home directory at `/srv/strapi/strapi`.

Please note that with this application it is intially created and ran in the `development` environment to allow for creating models. **You should not use this directly in production**, it is recommended that you configure a private git repository to commit changes into and create a new application directory within the service user's home (Example: `/srv/strapi/strapi-production`). To run the new `production` or `staging` environments you can refer to the [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/#managing-processes).

## Using the Service Account

By default the Strapi application will be running under a "service account", this is an account that is extremely limited into what it can do and access. The purpose of using a service account is to project your system from security threats.

### Accessing the service account

The first step in accessing your service account is to SSH into the `ubuntu` user, depending on your Operating System or your SSH client there may be multiple ways to do this. You should refer to your SSH clients documentation for clarification on using SSH keys.

After you have successfully logged into the `ubuntu` user you can now run `sudo su strapi` and this will take you to the `strapi` user's shell. To go back to the `ubuntu` user simplely run `exit`.

::: warning
Please note that by default the `strapi` user **cannot run sudo commands** this is intended!
:::

### Controlling the Strapi service and viewing logs

Once you are in the Strapi service account you can now use [PM2](https://pm2.keymetrics.io/docs/usage/quick-start/#managing-processes) to manage the Strapi process and view the logs.

The default service is called `strapi-develop` and should be running with an ID of `0`. Below are some example commands for PM2:

```bash
pm2 list # Will show you a list of all running processes
pm2 restart strapi-develop # Restart the Strapi process manually
pm2 stop strapi-develop # Stop the Strapi process
pm2 start strapi-develop # Start the Strapi process
pm2 logs strapi-develop # Show the logs in real time (to exit use ctrl +c)
```

Strapi will automatically start if the virtual machine is rebooted, you can also manually view the log files under `/srv/strapi/.pm2/logs` if you encounter any errors during the bootup.

## Changing the PostgreSQL Password

Because of how the virtual machine is created, your database is setup with a long and random password, however for security you should change this password before moving into a production-like setting.

Use the following steps to change the PostgreSQL password and update Strapi's config:

- Make sure you are logged into the `strapi` service user
- Stop the current strapi process and change the password for the `strapi` database user

```bash
pm2 stop strapi-develop
psql -c "ALTER USER strapi with password 'your-new-password';"
```

- Update the `/srv/strapi/strapi/config/environments/development/database.json` file with the new password.

```json
...
"settings": {
  "client": "postgres",
  "host": "127.0.0.1",
  "port": "5432",
  "database": "strapi",
  "username": "strapi",
  "password": "your-new-password"
},
...
```

- Restart Strapi and confirm the password change was successful

```bash
pm2 start strapi-develop
pm2 logs strapi-develop
```
