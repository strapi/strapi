# Deployment

Strapi gives you many possible deployment options for your project or application. Strapi can be deployed on traditional hosting servers or services such as Heroku, AWS, Azure and others. The following documentation covers how to develop locally with Strapi and deploy Strapi with various hosting options.



(Deploying **databases** along with Strapi is covered in the [Databases Guide](/3.x.x/guides/databases.html).)

**Table of contents:**

- [Configuration](#configuration)
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

**⚠️  If you changed the path to access to the administration, the step #2 is required.**

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

## Heroku

This is a step-by-step guide for deploying a Strapi project on [Heroku](https://www.heroku.com/). Databases that work well with Strapi and Heroku are provided instructions on how to get started.

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

(You can use `heroku create custom-project-name`, to have Heroku create a `custom-project-name.heroku.com` URL.  Otherwise, Heroku will automatically generating a random project name (and URL) for you.)

::: warning NOTE
If you have a Heroku project app already created. You would use the following step to initialize your local project folder:

`Path: ./my-project/`

```bash
heroku git:remote -a your-heroku-app-name
```
:::

Your local development environment is now set-up and configured to work with Heroku. You have a new Strapi project and a new Heroku app ready to be configured to work with a database and with each other.

### 7. Heroku Database set-up

Below you will find database options when working with Heroku.  Please choose the correct database (e.g. PostgreSQL, MongoDB, etc.) and follow those instructions. 

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

(This url is read like so: *postgres:// **USERNAME** : **PASSWORD** @ **HOST** : **PORT** : **DATABASE_NAME***)

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
