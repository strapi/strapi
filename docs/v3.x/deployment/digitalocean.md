# DigitalOcean

This is a step-by-step guide for deploying a Strapi project to [DigitalOcean](https://www.digitalocean.com/). Databases can be on a [DigitalOcean Droplet](https://www.digitalocean.com/docs/droplets/) or hosted externally as a service. Prior to starting this guide, you should have created a [Strapi project](../getting-started/quick-start.md). And have read through the [configuration](../getting-started/deployment.md#configuration) section.

::: tip
Strapi does have a [One-Click](../installation/digitalocean-one-click.md) deployment option for DigitalOcean
:::

### DigitalOcean Install Requirements

- You must have a [DigitalOcean account](https://m.do.co/c/30986c1ff595) before doing these steps.

### Create a "Droplet"

DigitalOcean calls a virtual private server, a [Droplet](https://www.digitalocean.com/docs/droplets/). You need to create a new `Droplet` to host your Strapi project.

#### 1. Log in to your [DigitalOcean account](https://cloud.digitalocean.com/login).

#### 2. `Create a Droplet` by clicking on `New Droplet`.

Choose these options:

- Ubuntu 18.04 x64
- STARTER `Standard`
- Choose an appropriate pricing plan. For example, pricing: `$10/mo` _(Scroll to the left)_
  ::: tip
  The \$5/mo plan is currently unsupported as Strapi will not build with 1G of RAM. At the moment, deploying the Strapi Admin interface requires more than 1g of RAM. Therefore, a minimum standard Droplet of **\$10/mo** or larger instance is needed.
  :::
- Choose a `datacenter` region nearest your audience, for example, `New York`.
- **OPTIONAL:** Select additional options, for example, `[x] IPv6`.
- Add your SSH key
  ::: tip
  We recommend you `add your SSH key` for better security.
  :::
  - In your terminal, use `pbcopy < ~/.ssh/id_rsa.pub` to copy your existing SSH public key, on your development computer, to the clipboard.
  - Click on `New SSH Key` and paste in your `SSH Key`. `Name` this SSH key and then `Save`.
    (Additional instructions on creating and using SSH Keys can be found [here](https://www.digitalocean.com/docs/droplets/how-to/add-ssh-keys/create-with-openssh/).)
- **OPTIONAL:** `Choose a hostname` or leave as-is.
- Click the green `Create` button.

**DigitalOcean** will create your **Droplet** and indicate the progress with a percentage bar. Once this is complete, you may continue to the next steps.

### Setup production server and install Node.js

These next steps will help you to _set up a production server_ and _set up a non-root user_ for managing your server.

Follow the official [DigitalOcean docs for initial server set-up using Ubuntu 18.04](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04). These docs will have you complete the following actions:

#### 1. [Logging and set up root user access to your server with SSH](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-1-%E2%80%94-logging-in-as-root).

#### 2. [Creating a new user](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-2-%E2%80%94-creating-a-new-user).

#### 3. [Granting Administrative Privileges to the new user](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-3-%E2%80%94-granting-administrative-privileges).

#### 4. [Setting up a basic firewall](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-4-%E2%80%94-setting-up-a-basic-firewall).

#### 5. [Giving your regular user access to the server](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-5-%E2%80%94-enabling-external-access-for-your-regular-user) **with SSH key authentication**.

Next, install `Node.js`:

#### 6. You will install `Node.js`.

Use the instructions in section **Install Node using a PPA** from the official [DigitalOcean docs for installing a production ready Node.js server](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04#installing-using-a-ppa).

After completing the steps to **install Node.js, NPM and the "build-essential package"**, you will manually change npm's default directory. The following steps are based on [how to resolve access permissions from npmjs.com](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally):

- Create a `.npm-global` directory and set the path to this directory for `node_modules`

```bash
cd ~
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
```

- Create (or modify) a `~/.profile` file and add this line:

```bash
sudo nano ~/.profile
```

Add these lines.

```ini
# set PATH so global node modules install without permission issues
export PATH=~/.npm-global/bin:$PATH
```

- Lastly, update your system variables:

```bash
source ~/.profile
```

You are now ready to continue to the next section.

### Install and Configure Git versioning on your server

A convenient way to maintain your Strapi application and update it during and after initial development is to use [Git](https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control). In order to use Git, you will need to have it installed on your Droplet. Droplets should have Git installed by default, so you will first check if it is installed and if it is not installed, you will need to install it.

The next step is to configure Git on your server.

#### 1. Check to see if `Git` is installed

If you see a `git version 2.x.x` then you do have `Git` installed. Check with the following command:

```bash
git --version
```

#### 2. **OPTIONAL:** Install Git.

:::note
Only do this step if _not installed_, as above. Please follow these directions on [how to install Git on Ubuntu 18.04](https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-18-04).
:::

#### 3. Complete the global **username** and **email** settings: [Setting up Git](https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-18-04#setting-up-git)

After installing and configuring Git on your Droplet. Please continue to the next step, [installing a database](#install-the-database-for-your-project).

### Install the database for your project

DigitalOcean has excellent documentation regarding the installation and use of the major databases that work with Strapi. The previous steps above should all be completed prior to continuing. You can find links, and any further instructions, below:

:::: tabs

::: tab PostgreSQL

1. [Install PostgresSQL on Ubuntu 18.04](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04)(Through **Step 4** - Creating a New Database).

Complete the steps to [install PostgreSQL](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04#step-1-%E2%80%94-installing-postgresql), [add a user](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04#step-3-%E2%80%94-creating-a-new-role) and [create a database](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04#step-4-%E2%80%94-creating-a-new-database).

2. In order to connect to a PostgreSQL database with Strapi, it needs either to have a password, or specifically state there is no password by noting an empty string. Follow these commands from your terminal to `alter` the `user` you created and `add a password`:

```bash
sudo -u postgres psql     //only necessary if you switched away from the postgres@ user
[sudo] password for your-name:
psql (10.8 (Ubuntu 10.8-0ubuntu0.18.04.1))
Type "help" for help.

psql
postgres=# ALTER USER your-name PASSWORD 'password';
ALTER ROLE
postgres=# \q
exit
```

- **OPTIONAL:** If in **Development**, your Strapi project is uses **SQLite**, you will need to install a dependency package called `pg`:

  - On your **Development** computer:

  `Path: ./my-project/`

  ```bash
  npm install pg --save
  ```

  The `pg` package is automatically installed locally if you choose `PostgreSQL` as the initial database choice when you first set-up Strapi.

You will need the **database name**, **username** and **password** for later use, please note these down.

### Local Development Configuration

- You must have [Git installed and set-up locally](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup).
- You must have created a repository for your Strapi project and have your development project initialized to this repository.

In your code editor, you will need to edit a file called `database.js`. Replace the contents of the file with the following.

`Path: ./config/database.js`

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'postgres',
        host: env('DATABASE_HOST', '127.0.0.1'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        username: env('DATABASE_USERNAME', ''),
        password: env('DATABASE_PASSWORD', ''),
      },
      options: {
        ssl: false,
      },
    },
  },
});
```

You are now ready to push these changes to Github:

```bash
git add .
git commit -m "Configured production/database.json"
git push
```

Please continue to the next section, [Deploy from GitHub](#deploy-from-github).

:::

::::

### Deploy from Github

You will next deploy your Strapi project to your Droplet by `cloning it from GitHub`.

From your terminal, `logged in as your non-root user` to your Droplet:

```bash
cd ~
git clone https://github.com/your-name/your-project-repo.git
```

Next, navigate to the `my-project` folder, the root for Strapi. You will now need to run `npm install` to install the packages for your project.

`Path: ./my-project/`

```bash
cd ./my-project/
npm install
NODE_ENV=production npm run build
```

Strapi uses `Port: 1337` by default. You will need to configure your `ufw firewall` to allow access to this port, for testing and installation purposes. After you have installed and [configured NGINX](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-18-04), you need to `sudo ufw deny 1337`, to close the port to outside traffic.

```bash
cd ~
sudo ufw allow 1337/tcp
sudo ufw enable

Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup
```

Your Strapi project is now installed on your **Droplet**. You have a few more steps prior to being able to access Strapi and [create your first user](../getting-started/quick-start.md#_3-create-an-admin-user).

You will next need to [install and configure PM2 Runtime](#install-and-configure-pm2-runtime).

### Install and configure PM2 Runtime

[PM2 Runtime](https://pm2.keymetrics.io) allows you to keep your Strapi project alive and to reload it without downtime.

Ensure you are logged in as a **non-root** user. You will install **PM2** globally:

```bash
npm install pm2@latest -g
```

### The ecosystem.config.js file

- You will need to configure an `ecosystem.config.js` file. This file will manage the **database connection variables** Strapi needs to connect to your database. The `ecosystem.config.js` will also be used by `pm2` to restart your project whenever any changes are made to files within the Strapi file system itself (such as when an update arrives from GitHub). You can read more about this file [here](https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/).

  - You will need to open your `nano` editor and then `copy/paste` the following:

```bash
cd ~
pm2 init
sudo nano ecosystem.config.js
```

- Next, replace the boilerplate content in the file, with the following:

```js
module.exports = {
  apps: [
    {
      name: 'strapi',
      cwd: '/home/your-name/my-strapi-project/my-project',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost', // database endpoint
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'strapi', // DB name
        DATABASE_USERNAME: 'your-name', // your username for psql
        DATABASE_PASSWORD: 'password', // your password for psql
      },
    },
  ],
};
```

You can also set your environment variables in a `.env` file in your project like so:

```
DATABASE_HOST=your-unique-url.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=Password
```

We recommend you continue setting the `NODE_ENV` variable in the `ecosystem.config.js` file.

Use the following command to start `pm2`:

```bash
cd ~
pm2 start ecosystem.config.js
```

`pm2` is now set-up to use an `ecosystem.config.js` to manage restarting your application upon changes. This is a recommended best practice.

**OPTIONAL:** You may see your project and set-up your first administrator user, by [creating an admin user](../getting-started/quick-start.md#_3-create-an-admin-user).

::: tip
Earlier, `Port 1337` was allowed access for **testing and setup** purposes. After setting up **NGINX**, the **Port 1337** needs to have access **denied**.
:::

Follow the steps below to have your app launch on system startup.

::: tip
These steps are modified from the DigitalOcean [documentation for setting up PM2](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-18-04#step-3-%E2%80%94-installing-pm2).
:::

- Generate and configure a startup script to launch PM2, it will generate a Startup Script to copy/paste, do so:

```bash
$ cd ~
$ pm2 startup systemd

[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your-name --hp /home/your-name
```

- Copy/paste the generated command:

```bash
$ sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your-name --hp /home/your-name

[PM2] Init System found: systemd
Platform systemd

. . .


[PM2] [v] Command successfully executed.
+---------------------------------------+
[PM2] Freeze a process list on reboot via:
   $ pm2 save

[PM2] Remove init script via:
   $ pm2 unstartup systemd
```

- Next, `Save` the new PM2 process list and environment. Then `Start` the service with `systemctl`:

```bash
pm2 save

[PM2] Saving current process list...
[PM2] Successfully saved in /home/your-name/.pm2/dump.pm2

```

- **OPTIONAL**: You can test to see if the script above works whenever your system reboots with the `sudo reboot` command. You will need to login again with your **non-root user** and then run `pm2 list` and `systemctl status pm2-your-name` to verify everything is working.

Continue below to configure the `webhook`.

### Set up a webhook on DigitalOcean / GitHub

Providing that your project is set-up on GitHub, you will need to configure your **Strapi Project Repository** with a webhook. The following articles provide additional information to the steps below: [GitHub Creating Webhooks Guide](https://developer.github.com/webhooks/creating/) and [DigitalOcean Guide to GitHub WebHooks](https://www.digitalocean.com/community/tutorials/how-to-use-node-js-and-github-webhooks-to-keep-remote-projects-in-sync).

- You will need to access the `Settings` tab for your `Strapi Project Repository`:

  1. Navigate and click to `Settings` for your repository.
  2. Click on `Webhooks`, then click `Add Webhook`.
  3. The fields are filled out like this:
     - Payload URL: Enter `http://your-ip-address:8080`
     - Content type: Select `application/json`
     - Which events would you like to trigger this webhook: Select `Just the push event`
     - Secret: Enter `YourSecret`
     - Active: Select the checkbox
  4. Review the fields and click `Add Webhook`.

- Next, you need to create a `Webhook Script` on your server. These commands create a new file called `webhook.js` which will hold two variables:

```bash
cd ~
mkdir NodeWebHooks
cd NodeWebHooks
sudo nano webhook.js
```

- In the `nano` editor, copy/paste the following script, but make sure to replace `your_secret_key` and `repo` with the values that correspond to your project, then save and exit.

(This script creates a variable called `PM2_CMD` which is used after pulling from GitHub to update your project. The script first changes to the home directory and then runs the variable `PM2_CMD` as `pm2 restart strapi`.

```js
var secret = 'your_secret_key';
var repo = '~/path-to-your-repo/';

const http = require('http');
const crypto = require('crypto');
const exec = require('child_process').exec;

const PM2_CMD = 'cd ~ && pm2 startOrRestart ecosystem.config.js';

http
  .createServer(function(req, res) {
    req.on('data', function(chunk) {
      let sig =
        'sha1=' +
        crypto
          .createHmac('sha1', secret)
          .update(chunk.toString())
          .digest('hex');

      if (req.headers['x-hub-signature'] == sig) {
        exec(`cd ${repo} && git pull && ${PM2_CMD}`, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
        });
      }
    });

    res.end();
  })
  .listen(8080);
```

- Allow the port to communicate with outside web traffic for `port 8080`:

```bash
sudo ufw allow 8080/tcp
sudo ufw enable

Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup
```

Earlier you setup `pm2` to start the services (your **Strapi project**) whenever the **Droplet** reboots or is started. You will now do the same for the `webhook` script.

- Install the webhook as a `Systemd` service

  - Run `echo $PATH` and copy the output for use in the next step.

```
echo $PATH

/home/your-name/.npm-global/bin:/home/your-name/bin:/home/your-name/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
```

- Create a `webhook.service` file:

```bash
cd ~
sudo nano /etc/systemd/system/webhook.service
```

- In the `nano` editor, copy/paste the following script, but make sure to replace `your-name` **in two places** with your username. Earlier, you ran `echo $PATH`, copy this to the `Environment=PATH=` variable, then save and exit:

```bash
[Unit]
Description=Github webhook
After=network.target

[Service]
Environment=PATH=your_path
Type=simple
User=your-name
ExecStart=/usr/bin/nodejs /home/your-name/NodeWebHooks/webhook.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

- Enable and start the new service so it starts when the system boots:

```bash
sudo systemctl enable webhook.service
sudo systemctl start webhook
```

- Check the status of the webhook:

```bash
sudo systemctl status webhook
```

- You may test your **webhook** by following the instructions [here](https://www.digitalocean.com/community/tutorials/how-to-use-node-js-and-github-webhooks-to-keep-remote-projects-in-sync#step-4-testing-the-webhook).

### Further steps to take

- You can **add a domain name** or **use a subdomain name** for your Strapi project, you will need to [install NGINX and configure it](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-18-04).
- Deny traffic to Port 1337. You have set-up a proxy using Nginx, you now need to block access by running the following command:

```
cd ~
sudo ufw deny 1337
```

- To **install SSL**, you will need to [install and run Certbot by Let's Encrypt](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-18-04).
- Set-up [Nginx with HTTP/2 Support](https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-with-http-2-support-on-ubuntu-18-04) for Ubuntu 18.04.

Your `Strapi` project has been installed on a **DigitalOcean Droplet** using **Ubuntu 18.04**.
