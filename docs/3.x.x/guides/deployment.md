# Deployment

Strapi gives you many possible deployment options for your project or application. Strapi can be deployed on traditional hosting servers or services such as Heroku, AWS, Azure and others. The following documentation covers how to develop locally with Strapi and deploy Strapi with various hosting options.

(Deploying **databases** along with Strapi is covered in the [Databases Guide](/3.x.x/guides/databases.html).)

**Table of contents:**

- [Configuration](#configuration)
- [Digital Ocean](#digital-ocean)
- [Heroku](#heroku)
- [Docker](#docker)

---

## Configuration

#### #1 - Configure

Update the `production` settings with the IP and domain name where the project will be running.

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "domain.io", // IP or domain
  "port": 1337,
  "autoReload": {
    "enabled": false
  },
  "admin": {
    "path": "/dashboard" // We highly recommend to change the default `/admin` path for security reasons.
  }
}
```

In case your database is not running on the same server, make sure that the environment of your production
database (`./config/environments/production/database.json`) is set properly.

If you are passing a number of configuration item values via environment variables which is always encouraged for production environment to keep application stateless, checkout the section for [Dynamic Configuration](../configurations/configurations.md#dynamic-configurations). Here is a hint on how to do it for production, for the configuration mentioned above:

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "${process.env.APP_HOST || '127.0.0.1'}"
  "port": "${process.env.NODE_PORT || 1337}",
  "autoReload": {
    "enabled": false
  },
  "admin": {
    "path": "/dashboard" // We highly recommend to change the default `/admin` path for security reasons.
  }
}
```

**⚠️ If you changed the path to access to the administration, the step #2 is required.**

#### #2 - Setup (optional)

Run this following command to install the dependencies and build the project with your custom configurations.

```bash
cd /path/to/the/project
npm run setup
```

::: note
To display the build logs use the --debug option `npm run setup --debug`.
:::

#### #3 - Launch the server

Run the server with the `production` settings.

```bash
NODE_ENV=production npm start
```

::: warning
We highly recommend to use [pm2](https://github.com/Unitech/pm2/) to manage your process.
:::

### Advanced configurations

If you want to host the administration on another server than the API, [please take a look at this dedicated section](../advanced/customize-admin.md#deployment).

## Digital Ocean

This is a step-by-step guide for deploying a Strapi project to [Digital Ocean](https://www.digitalocean.com/). Databases can be on a [Digital Ocean Droplet](https://www.digitalocean.com/docs/droplets/) or hosted externally as a service. Prior to starting this guide, you should have created a [Strapi project](/3.x.x/getting-started/quick-start.html).

### Digital Ocean Install Requirements

- You must have a free [Digital Ocean account](https://cloud.digitalocean.com/registrations/new) before doing these steps.

### Create a "Droplet"

Digital Ocean calls a virtual private server, a [Droplet](https://www.digitalocean.com/docs/droplets/). You need to create a new `Droplet` to host your Strapi project.

1. Log in to your [Digital Ocean account](https://cloud.digitalocean.com/login).
2. `Create a Droplet` by clicking on `New Droplet`. Choose these options:

- Ubuntu 18.04 x64
- STARTER `Standard`
- Choose an appropriate pricing plan. For example, pricing: `$5/mo` _(Scroll to the left)_
- Choose a `datacenter` region nearest your audience, for example, `New York`.
- **OPTIONAL:** Select additional options, for example, `[x] IPv6`.
- Add your SSH key **NOTE:** We recommend you `add your SSH key` for better security.
  - In your terminal, use `pbcopy < ~/.ssh/id_rsa.pub` to copy your existing SSH public key, on your development computer, to the clipboard.
  - Click on `New SSH Key` and paste in your `SSH Key`. `Name` this SSH key and then `Save`.
    (Additional instructions on creating and using SSH Keys can be found [here](https://www.digitalocean.com/docs/droplets/how-to/add-ssh-keys/create-with-openssh/).)
- **OPTIONAL:** `Choose a hostname` or leave as-is.
- Click the green `Create` button.

**Digital Ocean** will create your **Droplet** and indicate the progress with a percentage bar. Once this is complete, you may continue to the next steps.

### Setup production server and install Node.js

These next steps will help you to _set up a production server_ and _set up a non-root user_ for managing your server.

Follow the official [Digital Ocean docs for initial server set-up using Ubuntu 18.04](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04). These docs will have you complete the following actions:

1. [Logging and set up root user access to your server with SSH](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-1-%E2%80%94-logging-in-as-root).
2. [Creating a new user](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-2-%E2%80%94-creating-a-new-user).
3. [Granting Administrative Privileges to the new user](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-3-%E2%80%94-granting-administrative-privileges).
4. [Setting up a basic firewall](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-4-%E2%80%94-setting-up-a-basic-firewall).
5. [Giving your regular user access to the server](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-5-%E2%80%94-enabling-external-access-for-your-regular-user) **with SSH key authentication**.

Next, install `Node.js`:

6. You will install `Node.js` using the instructions in section **Install Node using a PPA** from the official [Digital Ocean docs for installing a production ready Node.js server](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04#installing-using-a-ppa).

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

Add this line.

```ini
export PATH=~/.npm-global/bin:$PATH
```

- Lastly, update your system variables:

```bash
source ~/.profile
```

You are now ready to continue to the next section.

### Install and Configure Git versioning on your server

A convenient way to maintain your Strapi application and update it during and after initial development is to use [Git](https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control). In order to use Git, you will need to have it installed on your Droplet. Droplets should have Git installed by default, so you will first check if it is installed and if it is not installed, you will need to install it.

The last step is to configure Git on your server.

1. Check to see if `Git` is installed, if you see a `git version 2.x.x` then you do have `Git` installed. Check with the following command:

```bash
git --version
```

2. **OPTIONAL:** Install Git. **NOTE:** Only do if _not installed_, as above. Please follow these directions on [how to install Git on Ubuntu 18.04](https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-18-04).

3. Complete the global **username** and **GitHub** settings: [Setting up Git](https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-18-04#setting-up-git)

After installing and configuring Git on your Droplet. Please continue to the next step, [installing a database](#install-the-database-for-your-project).

### Install the database for your project

Digital Ocean has excellent documentation regarding the installation and use of the major databases that work with Strapi. The previous steps above should all be completed prior to continuing. You can find links, and any further instructions, to each database guide below:

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "PostgreSQL" id="postgreSQL-ubuntu"

1. [Install PostgresSQL on Ubuntu 18.04](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04)(Through **Step 4** - Creating a New Database).

Complete the steps to [install PostgreSQL](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04#step-1-%E2%80%94-installing-postgresql), [add a user](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04#step-3-%E2%80%94-creating-a-new-role) and [create a database](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-postgresql-on-ubuntu-18-04#step-4-%E2%80%94-creating-a-new-database).

2. In order to connect to a PostgreSQL database with Strapi, it needs either to have a password, or specifically state there is no password by noting a empty string. Follow these commands from your terminal to `alter` the `user` you created and `add a password`:

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

- **Optional:** If in **Development**, your Strapi project is uses **SQLite**, you will need to install a dependency package called `pg`:

  - On your **Development** computer:

  `Path: ./my-project/`

  ```bash
  npm install pg --save
  ```

  **Note:** The `pg` package is automatically installed locally if you choose `PostgreSQL` as the initial database choice when you first set-up Strapi.

You will need the **database name**, **username** and **password** to continue to the next step of [configuring that database.json file](#local-development-configuration).

### Local Development Configuration

- You must have [Git installed and set-up locally](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup).
- You must have created a repository for your Strapi project and have your development project initilized to this repository.

In your code editor, you will need to edit a file called `database.json`. Replace the contents of the file with the following, but change the `username`, `password` and `database` to match your installation.

`Path: ./config/environments/production`

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "strapi-hook-bookshelf",
      "settings": {
        "client": "postgres",
        "host": "localhost",
        "port": 5432,
        "username": "your-name",
        "password": "password",
        "database": "strapi"
      },
      "options": {}
    }
  }
}
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
```

Strapi uses `Port: 1337` by default. You will need to configure your `ufw firewall` to allow access to this port:

```bash
cd ~
sudo ufw allow 1337/tcp
sudo ufw enable

Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup
```

Your Strapi project is now installed on your **Droplet**.

**OPTIONAL:** You may see your project and set-up your first administrator user, by doing the following:

- Navigate to the Strapi project folder. `Path: ./my-project/`. Run the following command from within the Strapi project root:

`Path: ./my-project/`

```bash
NODE_ENV=production npm run start

> my-project@0.1.0 start /home/path-to-your-project-folder/my-project
> node server.js

[2019-05-20T14:06:01.553Z] info Time: Mon May 20 2019 14:06:01 GMT+0000 (Coordinated Universal Time)
[2019-05-20T14:06:01.555Z] info Launched in: 2623 ms
[2019-05-20T14:06:01.555Z] info Environment: production
[2019-05-20T14:06:01.555Z] info Process PID: 7286
[2019-05-20T14:06:01.556Z] info Version: 3.0.0-alpha.25.2 (node v10.15.3)
[2019-05-20T14:06:01.556Z] info To shut down your server, press <CTRL> + C at any time

[2019-05-20T14:06:01.557Z] info ☄️  Admin panel: http://localhost:1337/admin
[2019-05-20T14:06:01.557Z] info ⚡️ Server: http://localhost:1337

```

Minimumly, [create an admin user](http://localhost:8080/documentation/3.x.x/getting-started/quick-start.html#_3-create-an-admin-user).

You will next need to [install and configure PM2 Runtime](#install-and-configure-pm2-runtime).

### Install and configure PM2 Runtime

[PM2 Runtime](https://pm2.io/doc/en/runtime/overview/?utm_source=pm2&utm_medium=website&utm_campaign=rebranding) allows you to keep your Strapi project alive and to reload it without downtime.

Ensure you are logged in as a **non-root** user. You will install **PM2** globally:

```bash
npm install pm2@latest -g
```

Navigate to your **Strapi Project folder** and use the following command to set the environment variable to production and start `pm2`:

`Path: ./my-project/`

```bash
NODE_ENV=production pm2 start --name="strapi" server.js
```

Follow the steps below to have your app launch on system startup. (**NOTE:** These steps are modified from the Digital Ocean [documentation for setting up PM2](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-18-04#step-3-%E2%80%94-installing-pm2).)

- Generate and configure a startup script to launch PM2, it will generate a Startup Script to copy/paste, do so:

```bash
$ cd ~
$ pm2 startup systemd

[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /home/your-name/.npm-global/lib/node_modules/pm2/bin/pm2 startup systemd -u your-name --hp /home/your-name
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

In the sections to follow, are a few recommended additional actions to make developing your project more efficient

### The ecosystem.config.js file

- You will need to configure an `ecosystem.config.js` file. It will be used by `pm2` to restart your project whenever any changes are made to files within the Strapi file system itself (such as when an update arrives from GitHub). You can read more about this file [here](https://pm2.io/doc/en/runtime/guide/development-tools/).

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
      name: 'your-app-name',
      cwd: '/home/your-name/my-strapi-project/my-project',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

`pm2` is now set-up to use an `econsystem.config.js` to manage restarting your application upon changes. This is a recommended best practice. Continue below to configure the `webhook`.

### Set up a webhook

Providing that your project is set-up on GitHub, you will need to configure your **Strapi Project Repository** with a webhook. The following articles provide additional information to the steps below: [GitHub Creating Webhooks Guide](https://developer.github.com/webhooks/creating/) and [Digital Ocean Guide to GitHub WebHooks](https://www.digitalocean.com/community/tutorials/how-to-use-node-js-and-github-webhooks-to-keep-remote-projects-in-sync).

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

- In the `nano` editor, copy/paste the following script, but make sure to replace `your_secret_key` and `repo` with the values that correspond to your project, then save and exit. **NOTE:** Earlier in this guide, there is a optional [recommended step](#the-ecosystem-config-js-file) to create an `ecosystem.config.js` file to manage your application restarting function.

(This script creates a variable called `PM2_CMD` which is used after pulling from GitHub to update your project. The script first changes to the home directory and then runs the variable `PM2_CMD` as `pm2 restart strapi`. If the project uses the `ecosystem.config.js` keep your `ecosystem.config.js` as the point of starting your application and use the alternative below. **PLEASE SEE COMMENTS IN THE CODE**.)

```js
var secret = 'your_secret_key';
var repo = '~/path-to-your-repo/';

const http = require('http');
const crypto = require('crypto');
const exec = require('child_process').exec;

// Use this command if you DID NOT create the ecosystem.config.js file
const PM2_CMD = 'pm2 restart strapi';
// Use this command if you DID create the ecosystem.config.js file and comment out/delete the above line.
// const PM2_CMD = 'cd ~ && pm2 startOrRestart ecosystem.config.js';

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
        exec(
          `cd ${repo} && git pull && ${PM2_CMD}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
          },
        );
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

- In the `nano` editor, copy/paste the following script, but make sure to replace `your-name` **in two places** with your username, then save and exit:

```bash
[Unit]
Description=Github webhook
After=network.target

[Service]
Environment=PATH=/PASTE-PATH_HERE
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
- To **install SSL**, you will need to [install and run Certbot by Let's Encrypt](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-18-04).
- Set-up [Nginx with HTTP/2 Support](https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-with-http-2-support-on-ubuntu-18-04) for Ubuntu 18.04.

Your `Strapi` project has been installed on a **Digital Ocean Droplet** using **Ubuntu 18.04**.

## Heroku

This is a step-by-step guide for deploying a Strapi project to [Heroku](https://www.heroku.com/). Databases that work well with Strapi and Heroku are provided instructions on how to get started.

### Heroku Install Requirements

- You must have [Git installed and set-up locally](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup).
- You must have a [free Heroku account](https://signup.heroku.com/) before doing these steps.

If you already have the Heroku CLI installed locally on your computer. Skip to [Login to Heroku](#_2-login-to-heroku-from-your-cli).

### 1. Heroku CLI Installation

Download and install the `Heroku CLI` for your operating system:

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "macOS"
[Download the installer](https://cli-assets.heroku.com/heroku.pkg)

Also available via Homebrew:

```bash
brew tap heroku/brew && brew install heroku
```

:::

::: tab "Ubuntu"
Run the following from your terminal:

```bash
sudo snap install --classic heroku
```

:::

::: tab "Windows"
Download the appropriate installer for your Windows installation:

[64-bit installer](https://cli-assets.heroku.com/heroku-x64.exe)
[32-bit installer](https://cli-assets.heroku.com/heroku-x86.exe)
:::

::::

### 2. Login to Heroku from your CLI

Next, you need to login to Heroku from your computer.

```bash
heroku login
```

Follow the instructions and return to your command line.

### 3. Create a new project (or use an existing one)

Create a [new Strapi project](/3.x.x/getting-started/quick-start.html) (if you want to deploy an existing project go to step 4).

::: warning NOTE

If you plan to use **MongoDB** with your project, [refer to the create a Strapi project with MongoDB section of the documentation](/3.x.x/guides/databases.html#install-mongodb-locally) then, jump to step 4.

:::

`Path: ./`

```bash
strapi new my-project --quickstart
```

**Note:** When you use `--quickstart` to create a Strapi project locally, a **SQLite database** is used which is not compatible with Heroku. Therefore, another database option [must be chosen](#_6-heroku-database-set-up).

### 4. Update `.gitignore`

Add the following line at end of `.gitignore`:

`Path: ./my-project/.gitignore`

```
package-lock.json
```

Even if it is usually recommended to version this file, it may create issues on Heroku.

### 5. Init a Git repository and commit your project

Init the Git repository and commit yoru project.

`Path: ./my-project/`

```bash
cd my-project
git init
git add .
git commit -am "Initial Commit"
```

### 6. Create a Heroku project

Create a new Heroku project.

`Path: ./my-project/`

```bash
heroku create
```

(You can use `heroku create custom-project-name`, to have Heroku create a `custom-project-name.heroku.com` URL. Otherwise, Heroku will automatically generating a random project name (and URL) for you.)

::: warning NOTE
If you have a Heroku project app already created. You would use the following step to initialize your local project folder:

`Path: ./my-project/`

```bash
heroku git:remote -a your-heroku-app-name
```

:::

Your local development environment is now set-up and configured to work with Heroku. You have a new Strapi project and a new Heroku app ready to be configured to work with a database and with each other.

### 7. Heroku Database set-up

Below you will find database options when working with Heroku. Please choose the correct database (e.g. PostgreSQL, MongoDB, etc.) and follow those instructions.

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "PostgreSQL" id="heroku-postgresql"

#### Heroku Postgres

Follow these steps to deploy your Strapi app to Heroku using **PostgreSQL**:

##### 1. Install the [Heroku Postgres addon](https://elements.heroku.com/addons/heroku-postgresql) for using Postgres.

To make things even easier, Heroku provides a powerful addon system. In this section, you are going to use the Heroku Postgres addon, which provides a free "Hobby Dev" plan. If you plan to deploy your app in production, it is highly recommended to switch to a paid plan.

`Path: ./my-project/`

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

##### 2. Retrieve database credentials

The add-on automatically exposes the database credentials into a single environment variable accessible by your app. To retrieve it, type:

`Path: ./my-project/`

```bash
heroku config
```

This should print something like this: `DATABASE_URL: postgres://ebitxebvixeeqd:dc59b16dedb3a1eef84d4999sb4baf@ec2-50-37-231-192.compute-2.amazonaws.com: 5432/d516fp1u21ph7b`.

(This url is read like so: \*postgres:// **USERNAME** : **PASSWORD** @ **HOST** : **PORT** : **DATABASE_NAME\***)

##### 3. Set environment variables

Strapi expects a variable for each database connection configuration (host, username, etc.). So, from the url above, you have to set several environment variables in the Heroku config:

```bash
heroku config:set DATABASE_USERNAME=ebitxebvixeeqd
heroku config:set DATABASE_PASSWORD=dc59b16dedb3a1eef84d4999a0be041bd419c474cd4a0973efc7c9339afb4baf
heroku config:set DATABASE_HOST=ec2-50-37-231-192.compute-2.amazonaws.com
heroku config:set DATABASE_PORT=5432
heroku config:set DATABASE_NAME=d516fp1u21ph7b
```

**Note:** Please replace these above values with the your actual values.

##### 4. Update your database config file

Replace the contents of `database.json` with the following:

`Path: ./config/environments/production/database.json`.

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "strapi-hook-bookshelf",
      "settings": {
        "client": "postgres",
        "host": "${process.env.DATABASE_HOST}",
        "port": "${process.env.DATABASE_PORT}",
        "database": "${process.env.DATABASE_NAME}",
        "username": "${process.env.DATABASE_USERNAME}",
        "password": "${process.env.DATABASE_PASSWORD}",
        "ssl": true
      },
      "options": {}
    }
  }
}
```

##### 5. Install the `pg` node module

Unless you originally installed Strapi with PostgreSQL, you need to install the [pg](https://www.npmjs.com/package/pg) node module.

`Path: ./my-project/`

```bash
npm install pg --save
```

:::

::: tab "MongoDB" id="heroku-mongodb"

#### MongoDB Atlas

(Using Strapi and MongoDB requires different set-up and different configuration steps. You cannot use `--quickstart` to develop a `MongoDB` Strapi project.)

Please follow these steps the **deploy a Strapi app with MongoDB on Heroku**.

You must have completed the [steps to use Strapi with MongoDB Atlas in production](/3.x.x/guides/databases.html#install-on-atlas-mongodb-atlas).

##### 1. Set environment variables

When you [set-up your MongoDB Atlas database](/3.x.x/guides/databases.html#install-on-atlas-mongodb-atlas) you created and noted the five key/value pairs that correspond to your **MongoDB Atlas** database. These five keys are: `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE PORT`, and `DATABASE_HOST`.

Strapi expects a variable for each database connection detail (host, username, etc.). So, from **MongoDB Atlas**, you have to set the environment variables in the Heroku config (for **DATABASE_HOST** you need to surround the URL with **""**, and set **DATABASE_PORT** to nothing):

```bash
heroku config:set DATABASE_USERNAME=paulbocuse
heroku config:set DATABASE_PASSWORD=mySecretPassword
heroku config:set DATABASE_HOST="stapi-mongo-heroku-shard-00-00-fty6c.mongodb.net:27017,strapi-mongo-heroku-shard-00-01-fty6c.mongodb.net:27017,strapi-mongo-heroku-shard-00-02-fty6c.mongodb.net:27017/test?ssl=true&replicaSet=strapi-mongo-heroku-shard-0&authSource=admin&retryWrites=true"
heroku config:set DATABASE_PORT=
heroku config:set DATABASE_NAME=strapi-mongo-heroku
```

**Note:** Please replace these above values with the your actual values.

##### 2. Update your database config file

Replace the contents of `database.json` with the following:

`Path: ./config/environments/production/database.json`.

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "strapi-hook-mongoose",
      "settings": {
        "client": "mongo",
        "host": "${process.env.DATABASE_HOST}",
        "port": "${process.env.DATABASE_PORT}",
        "database": "${process.env.DATABASE_NAME}",
        "username": "${process.env.DATABASE_USERNAME}",
        "password": "${process.env.DATABASE_PASSWORD}"
      },
      "options": {
        "ssl": true
      }
    }
  }
}
```

::::

### 8. Commit your changes

`Path: ./my-project/`

```bash
git commit -am "Update database config"
```

### 9. Deploy

`Path: ./my-project/`

```bash
git push heroku master
```

The deployment may take a few minutes. At the end, logs will display the url of your project (e.g. `https://mighty-taiga-80884.herokuapp.com`). You can also open your project using the command line:

`Path: ./my-project/`

```bash
heroku open
```

If you see the Strapi Welcome page, you have correctly set-up, configured and deployed your Strapi project on Heroku. You will now need to set-up your `admin user` as the production database is brand-new (and empty).

You can now continue with the [Tutorial - Creating an Admin User](/3.x.x/getting-started/quick-start-tutorial.html#_3-create-an-admin-user), if you have any questions on how to proceed.

::: warning NOTE
For security reasons, the Content Type Builder plugin is disabled in production. To update content structure, please make your changes locally and deploy again.
:::

---

### Project updates

When Strapi is deployed to Heroku, Heroku sets the environment variable to `NODE_ENV=production`. In `production mode` Strapi disables the content-type builder (for security reasons). Additionally, if you wanted to change the default production mode in Heroku, it wouldn't work as the file system is temporary. Strapi writes files to the server when you update the content-types and these updates would disappear when Heroku restarts the server.

Therefore, modifications that require writing to model creation or other json files, e.g. creating or changing content-types, require that you make those changes on your dev environment and then push the changes to Heroku.

As you continue developing your application with Strapi, you may want to use [version control](https://devcenter.heroku.com/articles/github-integration), or you can continue to use `Git push heroku master` to commit and push changes to Heroku directly.

`Path: ./my-project/`

```bash
git add .
git commit -am "Changes to my-project noted"
git push heroku master
heroku open
```

## Docker

::: tip
You can also deploy using [Docker](https://hub.docker.com/r/strapi/strapi)
:::

The method below describes regular deployment using the built-in mechanisms.
