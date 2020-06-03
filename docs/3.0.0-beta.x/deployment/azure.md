# Azure

This is a step-by-step guide for deploying a Strapi project to [Azure](https://azure.microsoft.com/en-us/). Databases can be on a [Azure Virtual Machine](https://azure.microsoft.com/en-us/services/virtual-machines/), hosted externally as a service, or via the [Azure Managed Databases](https://azure.microsoft.com/en-us/services/postgresql/). Prior to starting this guide, you should have created a [Strapi project](../getting-started/quick-start.md). And have read through the [configuration](../getting-started/deployment.md#configuration) section.

### Azure Install Requirements

- You must have an [Azure account](https://azure.microsoft.com/en-us/free/) before doing these steps.
- An SSH key to access the virtual machine

### Create a Virtual Machine

You will want to use an Azure Virtual Machine for Strapi deployments, the Azure web-app (IIS) deployments are not recommended.

#### 1. Log in to your [Azure Portal](https://portal.azure.com/#home)

#### 2. Create a VM by clicking on `Create a resource`

#### 3. Basics

Virtual machines are listed under the `Compute` category. You will need the following options:

Project Details:

- **Subscription**: Can be left as the default
- **Resource Group**: If you have none, simply hit `Create new`

Instance Details:

- **Virtual machine name**: This name is used as a resource identifier and the VM's hostname so try to keep it simple
- **Region**: Select the nearest region to you, or your target area
- **Availability options**: Leave as default
- **Image**: Ubuntu Server 18.04 LTS
- **Azure Spot instance**: No
- **Size**: B1ms (1vCPU / 2 GiB of Ram) is the recommended minimum as you need at least 2 GiB of RAM to build the Admin panel

Administrator Account:

- **Authentication type**: It's recommended you use `SSH public key`
- **Username**: This is the SSH user, it can be set to whatever you like except `root`

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

- **Source**: Any
- **Source port ranges**: `*`
- **Destination**: Any
- **Destination port ranges**: The port from above (80, 443, or 1337)
- **Protocol**: Any
- **Action**: Allow
- **Priority**: This should be auto-filled for you
- **Name**: something to easily describe this rule such as `HTTPS_Port` or `Strapi_Port`

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

You will use the admin user created previously as well as the SSH key you added to your Azure account. For Linux/Mac users you can use your terminal, likewise for Windows users you can use the built -in SSH tool in Powershell or use an SSH client like Putty.

```bash
ssh yourAdminUser@yourAzureVMPublicIP

# ssh strapiAdmin@10.0.0.1
```

#### 2. Updating packages and installing dependencies

After you login via SSH we need to update the container and install any packages that Strapi may need. The following packages have been identified to be required to run Strapi on Ubuntu 18.04 LTS:

- libpng-dev
- build-essential
- nodejs (v12 thus we will use an external apt repo)
- yarn (optional but recommended)

First we need to update existing packages, you will use the apt package manager to do this:

```bash
sudo apt update
sudo apt upgrade -y
```

After the updates have installed, we will move on to installing required dependencies from the existing apt repos before we add any additional ones:

```bash
sudo apt install libpng-dev build-essential -y
```

For Node.js it is recommended you use the [official source](https://github.com/nodesource/distributions/blob/master/README.md#debinstall), per the instructions we will use the following commands:

```bash
curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
sudo apt install nodejs -y
```

Likewise for Yarn we will use the instructions from the [Yarn documentation](https://classic.yarnpkg.com/en/docs/install/#debian-stable):

```bash
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

sudo apt update
sudo apt install yarn -y
```

To verify you have everything installed properly you can run the following:

```bash
node -v && npm -v && yarn -v
```

This should print out the versions of each.

#### 3. Creating the Strapi service user and creating/cloning your project

A service user is defined as a user who has limited permissions and access, this user typically does not have access to `sudo` nor can modify anything else on the system.

We will create the service user with a disabled login to ensure it cannot be accessed via SSH.

```bash
sudo adduser --shell /bin/bash --disabled-login --gecos "" --quiet strapi
```

We will be making the `/srv/strapi` directory to hold our project. From here we can either create a new project or clone an existing one from say a Github or Gitlab repository. For private repositories, you will likely need to setup additional SSH keys and access.

First we will make the directory, then we will give the `strapi` service user access to read/write.

```bash
sudo mkdir /srv/strapi
sudo chown strapi:strapi /srv/strapi
```

#### 4. Choosing and installing a database

Strapi will need a database in order to save data to, you have multiple options for this.

- Using Azure managed databases
- Installing a database on this virtual machine
- Using SQLite on this virtual machine (does not require any additional software)

For Azure managed databases you can use the following:

- Azure Cosmos DB (Not officially supported, but has an option for MongoDB based API)
- Azure Database for MySQL
- Azure Database for PostgreSQL
- Azure Database for MariaDB

Likewise you can use any of the following installed locally on the virtual machine:

- MongoDB >= 3.6
- MySQL >= 5.6
- MariaDB >= 10.1
- PostgreSQL >= 10
- SQLite >= 3

In our example we will be using MariaDB 10.4 LTS using the MariaDB apt repo. Per the [documentation](https://downloads.mariadb.org/mariadb/repositories/#distro=Ubuntu&distro_release=bionic--ubuntu_bionic&mirror=digitalocean-sfo&version=10.4) we will use the following commands:

```bash
sudo apt-key adv --fetch-keys 'https://mariadb.org/mariadb_release_signing_key.asc'
sudo add-apt-repository 'deb [arch=amd64,arm64,ppc64el] http://sfo1.mirrors.digitalocean.com/mariadb/repo/10.4/ubuntu bionic main'

sudo apt update
sudo apt install mariadb-server-10.4 -y
```

Then we will need to create our Strapi database, database user, and grant the user access. We will need to enter a MySQL shell to perform these commands. MariaDB 10.4+ no longer has a root password and instead the root user is granted access via `sudo`

```bash
sudo mysql -u root
```

You should now see the following prompt `MariaDB [(none)]>`, this is the MySQL shell that allows us to give commands to the MariaDB server.

```bash
# Create the database
create database strapi_dev;

# Create the database user
create user strapi@localhost identified by 'mysecurepassword';

# Grant the database user permissions
grant all privileges on strapi_dev.* to strapi@localhost;

# Flush Privileges to reload the grant tables
FLUSH PRIVILEGES;

# Exit the MySQL shell
exit
```

And we now have everything we need to create/start our Strapi project.

### Creating or cloning our Strapi Project

If you are cloning a project from Git your configuration steps may be different depending on how you store private information such as database information, JWT secret keys, and various other secrets. In our case we will be creating a new project.

#### 1. Create the new project

You will first need to change users into the service user created previously, and change directories to the service directory

```bash
# Change users
sudo su strapi

# Change directory
cd /srv/strapi
```

Now we can use Yarn to create our project, this **does not** require you to install any global packages much like npx.

```bash
yarn create strapi-app mystrapiapp
```

This will bring you to an interactive command shell to enter the following information:

- **Choose your installation type**: Custom (manual settings)
- **Choose your default database client**: mysql
- **Database name**: `strapi_dev`
- **Host**: Keep the default of `127.0.0.1`
- **Port**: Keep the default of `3306`
- **Username**: `strapi`
- **Password**: `mysecurepassword`
- **Enable SSL connection**: Keep the default of `N`

Yarn will now install the project and install all the Node.js dependencies, we can now change directory again and start the project.

```bash
# Change directory
cd mystrapiapp

# Temporary start (will build the Admin panel)
yarn develop
```

Now you should be able to access your Strapi application on the public IP of your virtual machine via the default Strapi port of `1337`. Naturally if we close the SSH session the Strapi server will also be killed so we need to run it as a service.

#### 2. Modifying configurations to be more secure

By default Strapi will write the previous database settings in plain text to the `/srv/strapi/mystrapiapp/config/environments/development/database.json` file, and if you plan on pushing your project into Git you will not want these to be present. Thankfully Strapi can parse environment variables in JSON files.

If we edit the above file using `nano` we can replace a few key settings:

```bash
nano /srv/strapi/mystrapiapp/config/environments/development/database.json
```

Using the following example we will remove any private information:

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        "client": "mysql",
        "database": "${process.env.DB_NAME}",
        "host": "${process.env.DB_HOST}",
        "port": "${process.env.DB_PORT}",
        "username": "${process.env.DB_USER}",
        "password": "${process.env.DB_PASS}"
      },
      "options": {}
    }
  }
}
```

This now allows us to set the private database information using environment variables. Likewise we will want to do the same for the JWT (JSON Web Token) secret key located in `/srv/strapi/mystrapiapp/extensions/users-permissions/config/jwt.json`

Again using nano we will replace the secret key (do remember to take note of the generated one as we will need it later).

```json
{
  "jwtSecret": "${process.env.JWT_SECRET}"
}
```

#### 3. Installing PM2 and running Strapi as a service

Now we will install [PM2](https://pm2.keymetrics.io/docs/usage/quick-start/) to run Strapi as a service, and using the PM2 ecosystem config file we can define our environment variables.

::: tip
Using the lifecycle file **is not** required and is entirely optional, you can instead define your environment variables via the CLI
:::

Using Yarn, we will install PM2 globally, and adjust our `.bashrc` file to allow us to use global Yarn packages:

```bash
# Install PM2
yarn global add pm2

# Edit our ~/.bashrc file for global Yarn packages
nano ~/.bashrc
```

You will want to paste the following **at the end** of the `.bashrc file:

```
export PATH="$PATH:$(yarn global bin)"
```

From here you can either exit the service user and log back in for the changes to take effect or simply run:

```bash
source ~/.bashrc
```

And we will create our `ecosystem.config.js` using the `pm2 init` command, you should run this in your Strapi project directory

```bash
# Create the ecosystem file
pm2 init
```

You should get the message `File /srv/strapi/mystrapiapp/ecosystem.config.js generated`, lets go ahead and edit this file using `nano` and add our config settings.

```bash
nano /srv/strapi/mystrapiapp/ecosystem.config.js
```

Replace the boilerplate information with something like the following:

```js
module.exports = {
  apps: [
    {
      name: 'strapi-dev',
      cwd: '/srv/strapi/mystrapiapp',
      script: 'npm',
      args: 'run develop',
      env: {
        NODE_ENV: 'development',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'strapi_dev',
        DB_USER: 'strapi',
        DB_PASS: 'mysecurepassword',
        JWT_SECRET: '54265f24-b1e3-472a-a005-f681a905488f',
      },
    },
  ],
};
```

Then use the following command to start the Strapi service:

```bash
pm2 start ecosystem.config.js
```

The Strapi PM2 service is now set-up to use an `ecosystem.config.js` to manage your application.

**OPTIONAL:** You may see your project and set-up your first administrator user, by [creating an admin user](../getting-started/quick-start.md#_3-create-an-admin-user).

#### 4. Starting Strapi on boot and persisting service between reboots

Follow the steps below to have your app launch on system startup.

- Generate and configure a startup script to launch PM2, it will generate a Startup Script to copy/paste, do so:

```bash
pm2 startup systemd

[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your-name --hp /home/your-name
```

For the following command we want to be using your virtual machine admin user **not the service user**, to exit from the service user you can simply run the command `exit` to return to your admin user.

- Copy/paste the generated command as the virtual machine admin user (**DO NOT** use the below command as you need to replace the service user name, the previous command will give you exactly what you need):

```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your-name --hp /home/your-name

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

Now as the service user run the following (again use `sudo su yourserviceuser` to change back)

- Next, `Save` the new PM2 process list and environment.

```bash
pm2 save

[PM2] Saving current process list...
[PM2] Successfully saved in /home/your-name/.pm2/dump.pm2
```

- **OPTIONAL**: You can test to see if the script above works whenever your system reboots with the `sudo reboot` command. You will need to login again with your **service user** and then run `pm2 list` and `systemctl status pm2-your-name` to verify everything is working.

### Optional additions

Below are some optional additions to secure your virtual machine and Strapi service.

#### 1. Securing your virtual machine with a firewall

Azure virtual machines come with a firewall at the host level (see previous instructions [here](#_5-networking)). However it is recommended that you use the built in Ubuntu firewall as well known as UFW or Uncomplicated Firewall.

See the following [DigitalOcean guide](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-firewall-with-ufw-on-ubuntu-18-04) to see some examples of using UFW.

#### 2. Installing a proxy for SSL

There are many different types of proxy services you could use, anything from load balancing, offloading SSL, to fault tolerance. You can view a few [examples](./proxy) based around Strapi and basic SSL offloading.

#### 3. File upload providers

There are many options for storing files outside of your virtual machine, Strapi have built a few and the community is constantly building new ones. See the [following guide](../plugins/upload.md#install-providers) on searching for options as well as installing them.
