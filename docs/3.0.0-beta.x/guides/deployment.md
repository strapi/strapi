# Deployment

Strapi gives you many possible deployment options for your project or application. Strapi can be deployed on traditional hosting servers or services such as Heroku, AWS, Azure and others. The following documentation covers how to develop locally with Strapi and deploy Strapi with various hosting options.

::: tip
Deploying **databases** along with Strapi is covered in the [Databases Guide](../guides/databases.md).
:::

## Configuration

#### 1. Configure

Update the `production` settings with the IP and domain name where the project will be running.

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "domain.io", // IP or domain
  "port": 1337
}
```

In case your database is not running on the same server, make sure that the environment of your production
database (`./config/environments/production/database.json`) is set properly.

If you are passing a number of configuration item values via environment variables which is always encouraged for production environment, read the section for [Dynamic Configuration](../concepts/configurations.md#dynamic-configurations). Here is an example:

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "${process.env.APP_HOST || '127.0.0.1'}",
  "port": "${process.env.NODE_PORT || 1337}"
}
```

#### 2. Launch the server

Before running your server in production you need to build your admin panel for production

:::: tabs

::: tab yarn

```bash
NODE_ENV=production yarn build
```

:::

::: tab npm

```bash
NODE_ENV=production npm run build
```

:::

::: tab Windows

```bash
npm install cross-env
```

Then in your `package.json` scripts section:

```bash
"production": "cross-env NODE_ENV=production npm run build"
```

:::

::::

Run the server with the `production` settings.

:::: tabs

::: tab yarn

```bash
NODE_ENV=production yarn start
```

:::

::: tab npm

```bash
NODE_ENV=production npm start
```

:::

::: tab Windows

```bash
npm install cross-env
```

Then in your `package.json` scripts section:

```bash
"production": "cross-env NODE_ENV=production npm start"
```

:::

::::

::: warning
We highly recommend using [pm2](https://github.com/Unitech/pm2/) to manage your process.
:::

If you need a server.js file to be able to run `node server.js` instead of `npm run start` then create a `./server.js` file as follows:

```js
const strapi = require('strapi');

strapi(/* {...} */).start();
```

### Advanced configurations

If you want to host the administration on another server than the API, [please take a look at this dedicated section](../admin-panel/deploy.md).

## Docker

In this section, you will not find a specific guide to deploy your app with [Docker](https://www.docker.com/).

We recently updated the [strapi/strapi-docker](https://github.com/strapi/strapi-docker) GitHub repository that contains all informations needed to user Strapi with Docker.

## Amazon AWS

This is a step-by-step guide for deploying a Strapi project to [Amazon AWS EC2](https://aws.amazon.com/ec2/). This guide will connect to an [Amazon AWS RDS](https://aws.amazon.com/rds/) for managing and hosting the database. Optionally, this guide will show you how to connect host and serve images on [Amazon AWS S3](https://aws.amazon.com/s3/). Prior to starting this guide, you should have created a [Strapi project](../getting-started/quick-start.md), to use for deploying on AWS.

### Amazon AWS Install Requirement and creating an IAM non-root user

- You must have a free [Amazon AWS](aws.amazon.com/free) before doing these steps.

Best practices for using **AWS Amazon** services state to not use your root account user and to use instead the [IAM (AWS Identity and Access Management) service](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html). Your root user is therefore only used for a very few [select tasks](https://docs.aws.amazon.com/general/latest/gr/aws_tasks-that-require-root.html). For example, for **billing**, you create an **Administrator user and Group** for such things. And other, more routine tasks are done with a **regular IAM User**.

#### 1. Follow these instructions for [creating your Administrator IAM Admin User and Group](https://docs.aws.amazon.com/IAM/latest/UserGuide/getting-started_create-admin-group.html)

- Login as **root**.
- Create **Administrator** role.

#### 2. Next, create a **regular user** for the creation and management of your Strapi project

- Copy your **IAM Users sign-in link** found here: [IAM Console](https://console.aws.amazon.com/iam/home) and then log out of your **root user** and log in to your **administrator** user you just created.
- Return to the IAM Console by `searching for IAM` and clicking or going here: [IAM Console](https://console.aws.amazon.com/iam/home).
- Click on `Users`, in the left hand menu, and then click `Add User`:
  1. In the **Set user details** screen:
  - Provide a **User name**.
  - **Access Type**: Check both `Programmatic access` and `AWS Management Console access`.
  - `Autogenerate a password` or click `Custom password` and provide one.
  - **OPTIONAL:** For simplicity, `uncheck` the **Require password reset**.
  - Click `Next: Permissions`.
  2. In the **Set Permissions** screen, do the following:
  - Click `Create group`, name it, e.g. `Developers`, and then choose appropriate policies under **Policy Name**:
    - search for `ec2` and check `AmazonEC2FullAccess`
    - search for `RDS` and check `AmazonRDSFullAccess`
    - search for `s3` and check `AmazonS3FullAccess`
    - Click `Create group`
  - Click to `Add user to group` and check the `Developers` group, to add the new user.
  - Click `Next: Tags`.
  3. **Add tags** (optional)
  - This step is **optional** and based on your workflow and project scope.
  - Click `Next: Review`.
  4. **Review**
  - Review the information and ensure it is correct. Use `Previous` to correct anything.
  - Click `Create user`.
  5. **Success** - These are very **IMPORTANT CREDENTIALS**
     _If you do not do these steps you will have to reset your `Access key ID` and `Secret access key` later._
  - `Download the .csv file` and store it in a safe place. This contains the user name, login link, Access key ID and Secret access key.
  - **OPTIONAL:** Add these credentials to your \*Password manager\*\*.
  - Click on the `AWS Management Console Access sign-in link`. This will log you out of `Administrator`.

#### 3. `Log into` your **AWS Management Console** as your `regular user`

You may now proceed to the next steps.

#### Additional IAM User Resources

- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html).
- [Instructions to reset Access key ID and Secret access key](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html).

### Launch an EC2 virtual machine

Amazon calls a virtual private server, a **virtual server** or **Amazon EC2 instance**. To use this service you will `Launch Instance`. In this section, you will **establish IAM credentials**, **launch a new instance** and **set-up primary security rules**.

#### 1. From your **AWS Management Console** and as your **_regular_** user

- `Find Services`, search for `ec2` and click on `EC2, Virtual Servers in the Cloud`

#### 2. **Select Appropriate Region**

In the top menu, near your IAM Account User name, select, from the dropdown, the most appropriate region to host your Strapi project. For example, `US East (N.Virginia)` or `Asia Pacific (Hong Kong)`. You will want to remember this region for configuring other services on AWS and serving these services from the same region.

#### 3. Click on the blue `Launch Instance` button

- `Select` **Ubuntu Server 18.04 LTS (HVM), SSD Volume Type**
- Ensure `General purpose` + `t2.small` is `checked`.
  ::: tip
  `t2.small` is the smallest instance type in which Strapi runs. `t2.nano` and `t2.micro` **DO NOT** work. At the moment, deploying the Strapi Admin interface requires more than 1g of RAM. Therefore, **t2.small** or larger instance is needed.
  :::
- Click the grey `Next: Configure Instance Details` and `Next: Add Storage`
- In the **Step 4: Add Storage** verify the `General Purpose SSD (gb2)`, then click `Next: Add tags`.
- In the **Step 5: Add Tags**, add tags to suit your project or leave blank, then click `Next: Configure Security Group`.
- In the **Step 6: Configure Security Group**, configure the `security settings` as follows:
  - **Assign a security group:** Check as `Create a new security group`
  - **Security group name:** Name it, e.g. `strapi`
  - **Description:** Write a short description, e.g. `strapi instance security settings`
  - You should have a rule: **Type:** `SSH`, **Protocol:** `TCP`, **Port Range** `22`, **Source:** `0.0.0.0/0` (all IP addresses). If not, add it.
  - Click the grey `Add rule` to add each of these rules:
    - **Type:** `SSH`, **Protocol:** `TCP`, **Port Range** `22`, **Source:** `::/0`
    - **Type:** `HTTP`, **Protocol:** `TCP`, **Port Range** `80`, **Source:** `0.0.0.0/0, ::/0`
    - **Type:** `HTTPS`, **Protocol:** `TCP`, **Port Range** `443`, **Source:** `0.0.0.0/0, ::/0`
    - **Type:** `Custom TCP Rule`, **Protocol:** `TCP`, **Port Range** `1337`, **Source:** `0.0.0.0/0` **Description:** `Strapi for Testing Port`
      These rules are basic configuration and security rules. You may want to tighten and limit these rules based on your own project and organizational policies.
      ::: tip
      After setting up your Nginx rules and domain name with the proper aliases, you will need to delete the rule regarding port 1337 as this is for testing and setting up the project - **not for production**.
      :::
- Click the blue `Review and Launch` button.
- Review the details, in the **Step 7: Review Instance Launch**, then click the blue `Launch` button. Now, you need to **select an existing key pair** or **create a new key pair**. To create a new key pair, do the following:
  - Select the dropdown option `Create a new key pair`.
  - Name your the key pair name, e.g. `ec2-strapi-key-pair`
    ::: warning
    Download the **private key file** (.pem file). This file is needed, so note where it was downloaded.
    :::
  - After downloading the file, click the blue `Launch Instances` button.

Your instance is now running. Continue to the next steps.

### Install a PostgreSQL database on AWS RDS

Amazon calls their database hosting services **RDS**. Multiple database options exist and are available. In this guide, **PostgreSQL** is used as the example, and the steps are similar for each of the other database that are supported by Strapi. (**MySQL**, **MondoDB**, **PostgreSQL**, **MariaDB**, **SQLite**). You will set-up an **RDS instance** to host your `postgresql` database.

::: tip
**Amazon RDS** does **NOT** have a completely free evaluation tier. After finishing this guide, if you are only testing, please remember to [delete the database](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html). Otherwise, you will incur charges.
:::

#### 1. Navigate to the `AWS RDS Service`

In the top menu, click on `Services` and do a search for `rds`, click on `RDS, Managed Relational Database Service`.

#### 2. Select your region

In the top menu bar, select the region that is the same as the EC2 instance, e.g. `EU (Paris)` or `US East (N. Virgina)`.

#### 3. Create the database

Click the orange `Create database` button.
Follow these steps to complete installation of a `PostgreSQL` database:

- **Engine Options:** Click on `PostgreSQL`, version **PostgreSQL 10.x-R1**
- **Templates:** Click on `Free Tier`.
- **Settings**
  - **DB instance identifier** Give a name to your database, e.g. `strapi-database`
  - **Credential Settings**: This is your `psql` database _username_ and _password_.
    - **Master username:** Keep as `postgres`, or change (optional)
    - `Uncheck` _Auto generate a password_, and then type in a new secret password.
- **Connectivity**, and **Additional connectivity configuration**: Set `Publicly accessible` to `Yes`.
- **OPTIONAL:** Review any further options (**DB Instance size**, **Storage**, **Connectivity**), and modify to your project needs.
- You need to give you Database a name. Under **Additional configuration**:
  - **Additional configuration**, and then **Initial database name:** Give your database a name, e.g. `strapi`.
- Review the rest of the options and click the orange, `Create database` button.

After a few minutes, you may refresh your page and see that your database has been successfully created.

### Configure S3 for image hosting

Amazon calls cloud storage services **S3**. You create a **bucket**, which holds the files, images, folders, etc... which then can be accessed and served by your application. This guide will show you have to use **Amazon S3** to host the images for your project.

#### 1. Navigate to the `Amazon S3`

In the top menu, click on `Services` and do a search for `s3`, click on `Scalable storage in the cloud`.

#### 2. Create the bucket

Click on the blue `Create bucket` button:

- Give your bucket a unique name, under **Bucket name**, e.g. `my-project-name-images`.
- Select the most appropriate region, under **Region**, e.g. `EU (Paris)` or `US East (N. Virgina)`.
- Click `Next`.
- Configure any appropriate options for your project in the **Configure Options** page, and click `next`.
- Under **Block public access**:
  - Uncheck `Block all public access` and set the permissions as follows:
    - `Uncheck` Block new public ACLs and uploading public objects (Recommended)
    - `Uncheck` Block public access to buckets and objects granted through any access control lists (ACLs)
    - `Check` Block public access to buckets and objects granted through new public bucket policies
    - `Check` Block public and cross-account access to buckets and objects through any public bucket policies
  - Select `Do not grant Amazon S3 Log Delivery group write access to this bucket`.
- Click `Next`.
- **Review** and click `Create bucket`.

### Configure EC2 as a Node.js server

You will set-up your EC2 server as a Node.js server. Including basic configuration and Git.

You will need your **EC2** ip address:

- In the `AWS Console`, navigate to the `AWS EC2`. In the top menu, click on `Services` and do a search for `ec2`, click on `Virtual Servers in the cloud`.
- Click on `1 Running Instance` and note the `IPv4 Public OP` address. E.g. `34.182.83.134`.

#### 1. Setup the `.pem` file

- You downloaded, in a previous step, your `User` .pem file. e.g. `ec2-strapi-key-pair.pem`. This needs to be included in each attempt to `SSH` into your `EC2 server`. Move your `.pem` file to `~/.ssh/`, follow these steps:
- On your local machine, navigate to the folder that contains your .pem file. e.g. `downloads`
- Move the .pem file to `~/.ssh/` and set file permissions:
  `Path:./path-to/.pem-file/`

```bash
mv ec2-strapi-key-pair.pem ~/.ssh/
chmod 400 ~/.ssh/ec2-strapi-key-pair.pem
```

#### 2. Log in to your server as the default `ubuntu` user:

::: tip
In the future, each time you log into your `EC2` server, you will need to add the path to the .pem file, e.g. `ssh -i ~/.ssh/ec2-strapi-key-pair.pem ubuntu@12.123.123.11`.
:::

```bash
ssh -i ~/.ssh/ec2-strapi-key-pair.pem ubuntu@12.123.123.11

Welcome to Ubuntu 18.04.2 LTS (GNU/Linux 4.15.0-1032-aws x86_64)

...

To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

ubuntu@ip-12.123.123.11:~$

```

#### 3. Install **Node.js** with **npm**:

Strapi currently supports `Node.js v10.x.x`. The following steps will install Node.js onto your EC2 server.

```bash
cd ~
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
...
sudo apt-get install nodejs
...
node -v && npm -v
```

The last command `node -v && npm -v` should output two versions numbers, eg. `v10.x.x, 6.x.x`.

#### 4. Create and change npm's default directory.

The following steps are based on [how to resolve access permissions from npmjs.com](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally):

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

Add these lines at the bottom of the `~/.profile` file.

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

A convenient way to maintain your Strapi application and update it during and after initial development is to use [Git](https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control). In order to use Git, you will need to have it installed on your EC2 instance. EC2 instances should have Git installed by default, so you will first check if it is installed and if it is not installed, you will need to install it.

The next step is to configure Git on your server.

#### 1. Check to see if `Git` is installed

If you see a `git version 2.x.x` then you do have `Git` installed. Check with the following command:

```bash
git --version
```

#### 2. **OPTIONAL:** Install Git.

::: tip
Only do if _not installed_, as above. Please follow these directions on [how to install Git on Ubuntu 18.04](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git).
:::

#### 3. Configure the global **username** and **email** settings: [Setting up Git - Your Identity](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup)

After installing and configuring Git on your EC2 instance. Please continue to the next step.

### Prepare and clone Strapi project to server

These instructions assume that you have already created a **Strapi** project, and have it in a **GitHub** repository.

You will need to update the `database.json` file to configure Strapi to connect to the `RDS` database. And you will need to install an npm package called `pg` locally on your development server.
::: tip
The `pg` package install is only necessary if you are using **PostgresSQL** as your database.
:::

#### 1. Install `pg` in your Strapi project.

On your development machine, navigate to your Strapi project root directory:
`Path: ./my-project/`

```bash
npm install pg
```

#### 2. Edit the `database.json` file.

Copy/paste the following:

`Path: ./my-project/config/environments/production/database.json`:

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        "client": "postgres",
        "host": "${process.env.DATABASE_HOST || '127.0.0.1'}",
        "port": "${process.env.DATABASE_PORT || 27017}",
        "database": "${process.env.DATABASE_NAME || 'strapi'}",
        "username": "${process.env.DATABASE_USERNAME || ''}",
        "password": "${process.env.DATABASE_PASSWORD || ''}"
      },
      "options": {
        "ssl": false
      }
    }
  }
}
```

#### 3. Install the **Strapi Provider Upload AWS S3 Plugin**:

`Path: ./my-project/`.

This plugin will allow configurations for each active environment.

```bash
npm install strapi-provider-upload-aws-s3@beta
```

#### 4. Push your local changes to your project's GitHub repository.

```bash
git add .
git commit -m 'installed pg, aws-S3 provider plugin and updated the production/database.json file'
git push
```

#### 5. Deploy from GitHub

You will next deploy your Strapi project to your EC2 instance by **cloning it from GitHub**.

From your terminal and logged into your EC2 instance as the `ubuntu` user:

```bash
cd ~
git clone https://github.com/your-name/your-project-repo.git
```

Next, navigate to the `my-project` folder, the root for Strapi. You will need to run `npm install` to install the packages for your project.

`Path: ./my-project/`

```bash
cd ./my-project/
npm install
NODE_ENV=production npm run build
```

Next, you need to install **PM2 Runtime** and configure the `ecosystem.config.js` file

#### 6. Install **PM2 Runtime**

[PM2 Runtime](https://pm2.io/doc/en/runtime/overview/?utm_source=pm2&utm_medium=website&utm_campaign=rebranding) allows you to keep your Strapi project alive and to reload it without downtime.

Ensure you are logged in as a **non-root** user. You will install **PM2** globally:

```bash
npm install pm2@latest -g
```

Now, you will need to configure an `ecosystem.config.js` file. This file will set `env` variables that connect Strapi to your database. It will also be used to restart your project whenever any changes are made to files within the Strapi file system itself (such as when an update arrived from Github). You can read more about this file [here](https://pm2.io/doc/en/runtime/guide/development-tools/).

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
      cwd: '/home/ubuntu/my-strapi-project/my-project',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        DATABASE_HOST: 'your-unique-url.rds.amazonaws.com', // database Endpoint under 'Connectivity & Security' tab
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'strapi', // DB name under 'Configuration' tab
        DATABASE_USERNAME: 'postgres', // default username
        DATABASE_PASSWORD: 'Password',
      },
    },
  ],
};
```

Use the following command to start `pm2`:

```bash
cd ~
pm2 start ecosystem.config.js
```

Your Strapi project should now be available on `http://your-ip-address:1337/`.

::: tip
Earlier, `Port 1337` was allowed access for **testing and setup** purposes. After setting up **NGINX**, the **Port 1337** needs to have access **denied**.
:::

#### 7. Configure **PM2 Runtime** to launch project on system startup.

Follow the steps below to have your app launch on system startup.

::: tip
These steps are based on the [PM2 Runtime Startup Hook Guide](https://pm2.io/doc/en/runtime/guide/startup-hook/).
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

- Next, `Save` the new PM2 process list and environment.

```bash
pm2 save

[PM2] Saving current process list...
[PM2] Successfully saved in /home/your-name/.pm2/dump.pm2

```

- **OPTIONAL**: You can test to see if the script above works whenever your system reboots with the `sudo reboot` command. You will need to login again with your **non-root user** and then run `pm2 list` and `systemctl status pm2-ubuntu` to verify everything is working.

### Configure Strapi Provider AWS S3 plugin

The next steps involve configuring Strapi to connect to the AWS S3 bucket.

#### 1. Locate your `IPv4 Public IP`:

- Login as your regular user to your `EC2 Dashboard`
- Click on `1 Running Instances`.
- Below, in the **Description** tab, locate your **IPv4 Public IP**

#### 2. Next, create your **Administrator** user, and login to Strapi:

- Go to `http://your-ip-address:1337/`
- Complete the registration form.
- Click `Ready to Start`

#### 3. Configure the plugin with your bucket credentials:

- From the left-hand menu, click `Plugins` and then the `cog` wheel located to the right of `Files Upload`.
- From the dropdown, under **Providers**, select `Amazon Web Service S3` and enter the configuration details:
  You can find the **Access API Token** and **Secret Access Token** in the **configuration.csv** file you downloaded earlier or if you saved them to your password manager.
  - **Access API Token**: This is your _Access Key ID_
  - **Secret Access Token**: This is your _Secret Access Key_
    Navigate back to your **Amazon S3 Dashboard**:
  - **Region**: Is your selected region, eg. `EU (Paris)`
  - **Bucket**: Is your bucket name, eg. `my-project-name-images`
  - Set your **Maximum size allowed(in MB)** to a value: eg. _10mb_
  - Select `ON`, for **Enable File Upload**
  - Click the `Save` button.

You may now test the image upload, and you will find your images being uploaded to **Amazon AWS S3**.

### Set up a webhook

Providing that your project is set-up on GitHub, you will need to configure your **Strapi Project Repository** with a webhook. The following article provides additional information to the steps below: [GitHub Creating Webhooks Guide](https://developer.github.com/webhooks/creating/).

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

(This script creates a variable called `PM2_CMD` which is used after pulling from GitHub to update your project. The script first changes to the home directory and then runs the variable `PM2_CMD` as `pm2 restart strapi`. The project uses the `ecosystem.config.js` as the point of starting your application.)

```js
var secret = 'your_secret_key'; // Your secret key from Settings in GitHub
var repo = '~/path-to-strapi-root-folder/'; // path to the root of your Strapi project on server

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
        exec(
          `cd ${repo} && git pull && ${PM2_CMD}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
          }
        );
      }
    });

    res.end();
  })
  .listen(8080);
```

- Allow the port to communicate with outside web traffic for `port 8080`:
  - Within your **AWS EC2** dashboard:
    - In the left hand menu, click on `Security Groups`,
    - Select with the checkbox, the correct `Group Name`, e.g. `strapi`,
    - At the bottom of the screen, in the **Inbound** tab, click `Edit`, and then `Add Rule`:
      - Type: `Custom TCP`
      - Protocol: `TCP`
      - Port Range: `8080`
      - Source: `Custom` `0.0.0.0/0, ::/0`
    - Then `Save`

Earlier you setup `pm2` to start the services (your **Strapi project**) whenever the **EC2 instance** reboots or is started. You will now do the same for the `webhook` script.

- Install the webhook as a `Systemd` service

  - Run `echo $PATH` and copy the output for use in the next step.

```
cd ~
echo $PATH

/home/your-name/.npm-global/bin:/home/your-name/bin:/home/your-name/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
```

- Create a `webhook.service` file:

```bash
sudo nano /etc/systemd/system/webhook.service
```

- In the `nano` editor, copy/paste the following script, but make sure to replace `ubuntu` **in two places** if you changed the default `ubuntu` user, and `paste the $PATH` from above.

::: warning
**DELETE THE #COMMENTS BEFORE SAVING**, then save and exit.
:::

```bash
[Unit]
Description=Github webhook
After=network.target

[Service]
Environment=PATH=/PASTE-PATH_HERE #path from echo $PATH (as above)
Type=simple
User=ubuntu #replace with your name, if changed from default ubuntu user
ExecStart=/usr/bin/nodejs /home/ubuntu/NodeWebHooks/webhook.js #replace with your name, if changed from default ubuntu user
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

- You can **add a domain name** or **use a subdomain name** for your Strapi project, you will need to [install NGINX](https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/) and [configure it](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-platform-proxy.html).
  ::: tip
  After setting up **NGINX**, for security purposes, you need to disable port access on `Port 1337`. You may do this easily from your **EC2 Dashboard**. In `Security Groups` (lefthand menu), click the checkbox of the group, eg. `strapi`, and below in the `inbound` tab, click `Edit`, and delete the rule for `Port Range` : `1337` by click the `x`.
  :::
- To **install SSL**, you will need to [install and run Certbot by Let's Encrypt](https://certbot.eff.org/docs/using.html).

- Set-up [Nginx with HTTP/2 Support](https://www.digitalocean.com/community/tutorials/how-to-set-up-nginx-with-http-2-support-on-ubuntu-18-04) for Ubuntu 18.04.

Your `Strapi` project has been installed on an **AWS EC2 instance** using **Ubuntu 18.04**.

## Digital Ocean

This is a step-by-step guide for deploying a Strapi project to [Digital Ocean](https://www.digitalocean.com/). Databases can be on a [Digital Ocean Droplet](https://www.digitalocean.com/docs/droplets/) or hosted externally as a service. Prior to starting this guide, you should have created a [Strapi project](../getting-started/quick-start.md).

### Digital Ocean Install Requirements

- You must have a [Digital Ocean account](https://cloud.digitalocean.com/registrations/new) before doing these steps.

### Create a "Droplet"

Digital Ocean calls a virtual private server, a [Droplet](https://www.digitalocean.com/docs/droplets/). You need to create a new `Droplet` to host your Strapi project.

#### 1. Log in to your [Digital Ocean account](https://cloud.digitalocean.com/login).

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

**Digital Ocean** will create your **Droplet** and indicate the progress with a percentage bar. Once this is complete, you may continue to the next steps.

### Setup production server and install Node.js

These next steps will help you to _set up a production server_ and _set up a non-root user_ for managing your server.

Follow the official [Digital Ocean docs for initial server set-up using Ubuntu 18.04](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04). These docs will have you complete the following actions:

#### 1. [Logging and set up root user access to your server with SSH](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-1-%E2%80%94-logging-in-as-root).

#### 2. [Creating a new user](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-2-%E2%80%94-creating-a-new-user).

#### 3. [Granting Administrative Privileges to the new user](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-3-%E2%80%94-granting-administrative-privileges).

#### 4. [Setting up a basic firewall](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-4-%E2%80%94-setting-up-a-basic-firewall).

#### 5. [Giving your regular user access to the server](https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu-18-04#step-5-%E2%80%94-enabling-external-access-for-your-regular-user) **with SSH key authentication**.

Next, install `Node.js`:

#### 6. You will install `Node.js`.

Use the instructions in section **Install Node using a PPA** from the official [Digital Ocean docs for installing a production ready Node.js server](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-18-04#installing-using-a-ppa).

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

Digital Ocean has excellent documentation regarding the installation and use of the major databases that work with Strapi. The previous steps above should all be completed prior to continuing. You can find links, and any further instructions, below:

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

In your code editor, you will need to edit a file called `database.json`. Replace the contents of the file with the following.

`Path: ./config/environments/production`

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        "client": "postgres",
        "host": "${process.env.DATABASE_HOST || '127.0.0.1'}",
        "port": "${process.env.DATABASE_PORT || 27017}",
        "database": "${process.env.DATABASE_NAME || 'strapi'}",
        "username": "${process.env.DATABASE_USERNAME || ''}",
        "password": "${process.env.DATABASE_PASSWORD || ''}"
      },
      "options": {
        "ssl": false
      }
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

[PM2 Runtime](https://pm2.io/doc/en/runtime/overview/?utm_source=pm2&utm_medium=website&utm_campaign=rebranding) allows you to keep your Strapi project alive and to reload it without downtime.

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
These steps are modified from the Digital Ocean [documentation for setting up PM2](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-18-04#step-3-%E2%80%94-installing-pm2).
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

### Set up a webhook on Digital Ocean / GitHub

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
        exec(
          `cd ${repo} && git pull && ${PM2_CMD}`,
          (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
          }
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

Your `Strapi` project has been installed on a **Digital Ocean Droplet** using **Ubuntu 18.04**.

## Heroku

This is a step-by-step guide for deploying a Strapi project on [Heroku](https://www.heroku.com/). Databases that work well with Strapi and Heroku are provided instructions on how to get started.

### Heroku Install Requirements

- You must have [Git installed and set-up locally](https://git-scm.com/book/en/v2/Getting-Started-First-Time-Git-Setup).
- You must have a [free Heroku account](https://signup.heroku.com/) before doing these steps.

If you already have the Heroku CLI installed locally on your computer. Skip to [Login to Heroku](#_2-login-to-heroku-from-your-cli).

#### 1. Heroku CLI Installation

Download and install the `Heroku CLI` for your operating system:

:::: tabs

::: tab "Mac O/S"
[Download the installer](https://cli-assets.heroku.com/heroku.pkg)

Also available via Homebrew:

```bash
brew tap heroku/brew && brew install heroku
```

:::

::: tab Ubuntu
Run the following from your terminal:

```bash
sudo snap install --classic heroku
```

:::

::: tab Windows
Download the appropriate installer for your Windows installation:

- [64-bit installer](https://cli-assets.heroku.com/heroku-x64.exe)
- [32-bit installer](https://cli-assets.heroku.com/heroku-x86.exe)
  :::

::::

#### 2. Login to Heroku from your CLI

Next, you need to login to Heroku from your computer.

```bash
heroku login
```

Follow the instructions and return to your command line.

#### 3. Create a new project (or use an existing one)

Create a [new Strapi project](../getting-started/quick-start.md) (if you want to deploy an existing project go to step 4).

::: warning NOTE

If you plan to use **MongoDB** with your project, [refer to the create a Strapi project with MongoDB section of the documentation](../guides/databases.md#install-mongodb-locally) then, jump to step 4.

:::

`Path: ./`

:::: tabs

::: tab yarn

Use **yarn** to install the Strapi project (**recommended**). [Install yarn with these docs](https://yarnpkg.com/lang/en/docs/install/)

```bash
yarn create strapi-app my-project --quickstart
```

:::

::: tab npx

Use **npm/npx** to install the Strapi project

```bash
npx create-strapi-app my-project --quickstart
```

:::

::::

::: tip
When you use `--quickstart` to create a Strapi project locally, a **SQLite database** is used which is not compatible with Heroku. Therefore, another database option [must be chosen](#_6-heroku-database-set-up).
:::

#### 4. Update `.gitignore`

Add the following line at end of `.gitignore`:

`Path: ./my-project/.gitignore`

```
package-lock.json
```

Even if it is usually recommended to version this file, it may create issues on Heroku.

#### 5. Init a Git repository and commit your project

Init the Git repository and commit your project.

`Path: ./my-project/`

```bash
cd my-project
git init
git add .
git commit -m "Initial Commit"
```

#### 6. Create a Heroku project

Create a new Heroku project.

`Path: ./my-project/`

```bash
heroku create
```

You can use `heroku create custom-project-name`, to have Heroku create a `custom-project-name.heroku.com` URL. Otherwise, Heroku will automatically generate a random project name (and URL) for you.

::: warning NOTE
If you have a Heroku project app already created. You would use the following step to initialize your local project folder:

`Path: ./my-project/`

```bash
heroku git:remote -a your-heroku-app-name
```

:::

Your local development environment is now set-up and configured to work with Heroku. You have a new Strapi project and a new Heroku app ready to be configured to work with a database and with each other.

#### 7. Heroku Database set-up

Below you will find database options when working with Heroku. Please choose the correct database (e.g. PostgreSQL, MongoDB, etc.) and follow those instructions.

:::: tabs

::: tab PostgreSQL

### Heroku Postgres

Follow these steps to deploy your Strapi app to Heroku using **PostgreSQL**:

#### 1. Install the [Heroku Postgres addon](https://elements.heroku.com/addons/heroku-postgresql) for using Postgres.

To make things even easier, Heroku provides a powerful addon system. In this section, you are going to use the Heroku Postgres addon, which provides a free "Hobby Dev" plan. If you plan to deploy your app in production, it is highly recommended switching to a paid plan.

`Path: ./my-project/`

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

#### 2. Retrieve database credentials

The add-on automatically exposes the database credentials into a single environment variable accessible by your app. To retrieve it, type:

`Path: ./my-project/`

```bash
heroku config
```

This should print something like this: `DATABASE_URL: postgres://ebitxebvixeeqd:dc59b16dedb3a1eef84d4999sb4baf@ec2-50-37-231-192.compute-2.amazonaws.com: 5432/d516fp1u21ph7b`.

(This url is read like so: \*postgres:// **USERNAME** : **PASSWORD** @ **HOST** : **PORT** : **DATABASE_NAME\***)

#### 3. Set environment variables

Strapi expects a variable for each database connection configuration (host, username, etc.). So, from the url above, you have to set several environment variables in the Heroku config:

```bash
heroku config:set DATABASE_USERNAME=ebitxebvixeeqd
heroku config:set DATABASE_PASSWORD=dc59b16dedb3a1eef84d4999a0be041bd419c474cd4a0973efc7c9339afb4baf
heroku config:set DATABASE_HOST=ec2-50-37-231-192.compute-2.amazonaws.com
heroku config:set DATABASE_PORT=5432
heroku config:set DATABASE_NAME=d516fp1u21ph7b
```

Please replace these above values with your actual values.

#### 4. Update your database config file

Replace the contents of `database.json` with the following:

`Path: ./config/environments/production/database.json`.

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
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

#### 5. Install the `pg` node module

Unless you originally installed Strapi with PostgreSQL, you need to install the [pg](https://www.npmjs.com/package/pg) node module.

`Path: ./my-project/`

```bash
npm install pg --save
```

:::

::: tab MongoDB

### MongoDB Atlas

(Using Strapi and MongoDB requires different set-up and different configuration steps. You cannot use `--quickstart` to develop a `MongoDB` Strapi project.)

Please follow these steps the **deploy a Strapi app with MongoDB on Heroku**.

You must have completed the [steps to use Strapi with MongoDB Atlas](../guides/databases.md#install-on-atlas-mongodb-atlas) - through **4. Retrieve database credentials**.

#### 1. Set environment variables

When you [set-up your MongoDB Atlas database](../guides/databases.md#install-on-atlas-mongodb-atlas) you noted a connection string. Similar to this:

```bash
mongodb://paulbocuse:<password>@strapidatabase-shard-00-00-fxxx6c.mongodb.net:27017,strapidatabase-shard-00-01-fxxxc.mongodb.net:27017,strapidatabase-shard-00-02-fxxxc.mongodb.net:27017/test?ssl=true&replicaSet=strapidatabase-shard-0&authSource=admin&retryWrites=true&w=majority

```

So, from **MongoDB Atlas**, you have to set two environment variables in the Heroku config (for **DATABASE_URI** and **DATABASE_NAME**). Set the environment variables using the following commands:

```bash
heroku config:set DATABASE_URI="mongodb://paulbocuse:<password>@strapidatabase-shard-00-00-fxxx6c.mongodb.net:27017,strapidatabase-shard-00-01-fxxxc.mongodb.net:27017,strapidatabase-shard-00-02-fxxxc.mongodb.net:27017/test?ssl=true&replicaSet=strapidatabase-shard-0&authSource=admin&retryWrites=true&w=majority"
heroku config:set DATABASE_NAME="my-database-name"
```

Please replace the `<password>` and `my-database-name` values with the your actual values.

#### 2. Update your database config file

Replace the contents of `database.json` with the following:

`Path: ./config/environments/production/database.json`.

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "mongoose",
      "settings": {
        "uri": "${process.env.DATABASE_URI}",
        "database": "${process.env.DATABASE_NAME}"
      },
      "options": {
        "ssl": true
      }
    }
  }
}
```

:::

::::

#### 8. Commit your changes

`Path: ./my-project/`

```bash
git add .
git commit -m "Update database config"
```

#### 9. Deploy

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

You can now continue with the [Tutorial - Creating an Admin User](../getting-started/quick-start-tutorial.md#_3-create-an-admin-user), if you have any questions on how to proceed.

::: warning
For security reasons, the Content Type Builder plugin is disabled in production. To update content structure, please make your changes locally and deploy again.
:::

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

### File Uploads

Like with project updates on Heroku, the file system doesn't support local uploading of files as they will be wiped when Heroku "Cycles" the dyno. This type of file system is called [ephemeral](https://devcenter.heroku.com/articles/dynos#ephemeral-filesystem), which means the file system only lasts until the dyno is restarted (with Heroku this happens any time you redeploy or during their regular restart which can happen every few hours or every day).

Due to Heroku's filesystem you will need to use an upload provider such as AWS S3, Cloudinary, or Rackspace. You can view the documentation for installing providers [here](../plugins/upload.md#install-providers) and you can see a list of providers from both Strapi and the community on [npmjs.com](https://www.npmjs.com/search?q=strapi-provider-upload-&page=0&perPage=20).

## Google App Engine

In this guide we are going to:

- create a new Strapi project
- configure PostgreSQL for the production enviroment
- deploy the app to Google App Engine
  - (using Standard Environment, but Flexible would be possible and probably easier)
- add the [Google Cloud Storage file uploading plugin](https://github.com/Lith/strapi-provider-upload-google-cloud-storage) by @Lith

### New Strapi project

```
yarn create strapi-app <YOUR_APP_NAME> --quickstart
```

The setup:

- Creates the initial files, configured to use `sqlite` database
- Runs `strapi build "--no-optimization"` to build the admin UI
- Runs `strapi develop`, which starts the app in `development` mode
- Open a the admin user registration form in the browser

```
: One more thing...                                                                                                                        
: Create your first administrator 💻 by going to the administration panel at:
: http://localhost:1337/admin
```

Setup an admin user. This user will be only relevant in local development.

The `sqlite` database is created at `.tmp/data.db`.

Login, but don't add content types yet. Close the browser. Quit the running app.

### Initial commit

This may be a good point to create and empty root commit and add the files in their initial state.

```
git init
git commit -m initial --allow-empty
git add -A .
git commit -m first
```

### Install the Cloud SDK CLI tool

https://cloud.google.com/sdk/

### New App Engine project

Create a new [App Engine](https://console.cloud.google.com/appengine/) project.

Select the region, such as `europe-west`.

Language: Node JS

Environment: Standard

The Flexible enviroment is also available, but incurs more cost.

Create the project. Take note of the instance identifier, which is in the form of `<instance_id>:<region>:<instance_name>`.

and see if `gcloud` lists it:

```
gcloud projects list
```

Run `init` to authenticate the cli, and select current cloud project.

```
gcloud init
```

### Create the database (PostgreSQL)

Create the [Cloud SQL database](https://cloud.google.com/sql/docs/postgres/create-manage-databases) which the app is going to use.

Take note of the user name (default is `postgres'`) and password.

The first database will be created with name `default`. This cannot be deleted.

Create another database, named `strapi`. It may be useful to delete and and re-create this while you are experimenting with the application setup.

### Create app.yaml and .gcloudignore

Create the `app.yaml` file in the project root.

Add `app.yaml` to `.gitignore`.

The instance identifier looks like `myapi-123456:europe-west1:myapi`.

``` yaml
runtime: nodejs10

instance_class: F2

env_variables:
  HOST: '<instance_id>.appspot.com'
  NODE_ENV: 'production'
  DATABASE_NAME: 'strapi'
  DATABASE_USERNAME: 'postgres'
  DATABASE_PASSWORD: '<password>'
  INSTANCE_CONNECTION_NAME: '<instance_identifier>'

beta_settings:
  cloud_sql_instances: '<instance_identifier>'
```

Create `.gcloudignore` in the project root.

```
.gcloudignore
.git
.gitignore
node_modules/
#!include:.gitignore
```

In the case of Strapi, the admin UI will have to be re-built after every deploy,
and so we don't deploy local build artifacts, cache files and so on by including
the `.gitignore` entries.

### Configure the database

The `PostgreSQL` database will need the `pg` package.

```
yarn add pg
```

[Google App Engine requires](https://cloud.google.com/sql/docs/postgres/connect-app-engine) to connect to the database using the unix socket path, not an IP and port.

Edit `database.json`, and use the socket path as `host`.

```
config/environments/production/database.json
```

``` json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        "client": "postgres",
        "host": "/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}",
        "database": "${process.env.DATABASE_NAME}",
        "username": "${process.env.DATABASE_USERNAME}",
        "password": "${process.env.DATABASE_PASSWORD}"
      },
      "options": {}
    }
  }
}
```

Edit `server.json` to pick up the deployed hostname from the `HOST` variable in `app.yaml`.

```
config/environments/production/server.json
```

``` json
{
  "host": "${process.env.HOST}",
  "port": "${process.env.PORT || 1337}",
  "production": true,
  "proxy": {
    "enabled": false
  },
  "cron": {
    "enabled": false
  },
  "admin": {
    "autoOpen": false
  }
}
```

### Auto-build after deploy

After deployment, the admin UI has to be re-built. This generates the contents of the `build` folder on the server.

In `package.json`, add the `gcp-build` command to `scripts`:

``` json
{
  "scripts": {
    "gcp-build": "strapi build"
  }
}
```

### Deploy

```
gcloud app deploy app.yaml --project myapi-123456
```

Watch the logs:

```
gcloud app logs tail --project=myapi-123456 -s default
```

Open the admin page and register and admin user.

```
https://myapp-123456.appspot.com/admin/
```

### Creating new content types

Open in develoment mode locally.

```
yarn develop
```

Content Type Builder > Create new content type

```
model name: book
title: text
description: rich text
```

Save.

```
model name: author
name: text
```

Save.

Open the `Book` type, add a relation:

```
book has and belongs to many authors
```

Save.

Logout, quit the quit running app.

The `api/` folder now includes `book` and `author`.

Deploy.

```
gcloud app deploy app.yaml --project myapi-123456
```

It might say `Uploading 0 files`, but if you look the service sources, you should see the new version.

App Engine > Services > myapi (2 versions) > Source

The contents of the `api` folder were deployed, you can inspect the `book` and `author` folders.

Visit and reload the app URL so that the new version is started up.

https://myapi-123456.appspot.com

Login to the admin UI.

https://myapi-123456.appspot.com/admin

Open Books and Authors, add records and create relations.

If you haven't enabled the permission yet, the API will respond with `403 Forbidden`.

https://myapi-123456.appspot.com/books

Update Permissions:

Roles and Permissions > Public

Enable `count`, `find`, `findone` for `author` and `book`.

https://myapi-123456.appspot.com/books

Should returns the JSON data.

### File uploading to Google Cloud Storage

https://github.com/Lith/strapi-provider-upload-google-cloud-storage

```
yarn add strapi-provider-upload-google-cloud-storage
```

Deploy so that the server app includes the dependency from =package.json=.

Create a Google service account key.

https://console.cloud.google.com/apis/credentials/serviceaccountkey

Save the JSON credentials file.

Plugins > File Upload > Settings > Production tab

By default localhost is selected. Select the Google Cloud Storage plugin.

Copy the JSON key and set the regions.

Cloud Console > Storage > Browser

Copy the bucket name to the plugin settings, the default is the app ID, such as `myapi-123456.appspot.com`.

Save.

In the Strapi Admin UI:

Roles & Permissions > Public > Upload

Enable `count` and `findone`.

https://myapi-123456.appspot.com/upload/files/count

Should return `{"count":"0"}`.

Files Upload > upload a file.

`/files/count` should new return `1`.

Logout.

Start the local dev server and login to the Admin UI.

```
yarn develop
```

Add a Media field to the Book type.

Content Types > Book > Add another field > Media field

```
name: downloads
Multiple media
```

Save.

Deploy, and login to the server Admin UI.

Open one of the books and add downloads. Save.

The `/books` api should display the associated files.

https://myapi-123456.appspot.com/books

### Success!

Read to go!

### Post-setup configuration

**CORS**

CORS is enabled by default, allowing `*` origin. You may want to limit the allowed origins.

```
config/environments/production/security.json
```

**Changing the admin url.**

```
config/environments/production/server.json
```

``` json
{
  "admin": {
    "path": "/dashboard"
  }
}
```

