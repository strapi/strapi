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

### Step 3: Visit your app

Please note that it may take anywhere from 30 seconds to a few minutes for the droplet to startup, when it does you should see it in your [droplets list](https://cloud.digitalocean.com/droplets).

From here you will see the public ipv4 address that you can use to visit your Strapi application, just open that in a browser and it should ask you to create your first administrator!

You can also SSH into the virtual machine using `root` as the SSH user and your public ipv4 address, there is no password for SSH as DigitalOcean uses SSH keys by default with password authentication disabled.

## Using the Service Account

By default the Strapi application will be running under a "service account", this is an account that is extremely limited into what it can do and access. The purpose of using a service account is to project your system from security threats.

### Accessing the service account

The first step in accessing your service account is to SSH into the root user, depending on your Operating System or your SSH client there may be multiple ways to do this. You should refer to your SSH clients documentation for clarification on using SSH keys.

After you have successfully logged into the root user you can now run `sudo su strapi` and this will take you to the `strapi` user's shell. To go back to the root user simplely run `exit`.

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

## Migration to Production

The default environment for Strapi's one-click is using `development` as to allow you to create content-types and configure key settings. However if you wish to use this in a `production` environment there will need to be a few key steps. Each of these steps is to ensure you have a stable environment that can be rolled back if there is problems.

### Creating a Github repository

Creating a Github or Gitlab repository is useful for keeping track of changes you have made in development and pushing those changes onto your production instance. This allows you to change things and test them before actually deploying those changes for your users.

If you don't already have one you will need to create a [Github Account](https://github.com/join?source=header-home), after that you will want to create a [new repository](https://github.com/new). This is where you can choose to make it public or private. Private repositories can only be seen by you and people you invite, as a personal user you can create unlimited private repositories.

#### Ignoring secret files

After you have created the new repository we need to push our current code, however before we do that we need to make a few changes to ensure none of our private information is pushed into Github like passwords.

Use any editor (Nano, VIM, Emacs, ect) to edit the `/srv/strapi/strapi/.gitignore` file, we need to add the following under the Strapi block:

```txt
extensions/users-permissions/config/jwt.json
config/environments/development/database.json
config/staging/development/database.json
config/production/development/database.json
```

This will prevent leaking of your JSON Web Token secret and database password.

#### Initialize your repository and pushing your project code

Now that we have created our repository on Github we need to initalize it on the server and push our changes to Github. While in the `/srv/strapi/strapi` directory:

```bash
# Initialize the Git Repo
git init

# Configure your git user and email
git config --global user.name "Your Name"
git config --global user.email "youremail@example.com"

# Adding and commiting your files
git add .
git commit -m "My first commit!"
```

Now we have made the commit locally on the server but we haven't sent it to our Github repository yet. Before we do that we need to setup authentication first. For the sake of this guide we will be using SSH keys. We will be generating a new one, adding it to Github, and finally linking our server repository to our Github one.

```bash
# Create your ssh key, follow prompts
ssh-keygen

# After prompts lets grab our public key
cat ~/.ssh/id_rsa.pub
```

Now from here you will need to [create a new SSH key](https://github.com/settings/ssh/new) by pasting the output of the last command into the key box (it should start with `ssh-rsa`). Now we can push our code, you should see on your Github repository to "push an existing repository from the command line".

```bash
git remote add origin git@github.com:yourusername/yourrepositoryname.git
git push -u origin master
```

You should now be able to refresh your Github page and see your code!

### Mirroring your development environment

Now that we have our development code in Github, we can mirror it into production. First thing to note is you should not use the same database for both environments. As you could accidently break your production environment by making a change in development.

#### Creating a new database

First we will create a new PostgreSQL database for the production environment. We will be issuing most of the command while in a `psql` shell so they may look a bit different than typical bash. **You will need to do the following commands as the `root` user**

```bash
# Enter the PostgreSQL shell
sudo -u postgres psql
```

```sql
/* Create the new Database */
create database strapi_production;

/* Grant the strapi user permissions */
grant all privileges on database strapi_production to strapi;
```

You now should be able to connect to the new `strapi_production` database when setting up the production Strapi environment later on.

#### Cloning your project code

#### Running a production process

### Reconfiguring Nginx

### Future changes to Development and how to migrate to production
