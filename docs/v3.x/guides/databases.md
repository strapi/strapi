# Databases

Strapi gives you the option to choose the most appropriate database for your project, it currently supports:

- **PostgreSQL**
- **MySQL**
- **MariaDB**
- **SQLite**
- **MongoDB**

The following documentation covers how to install these databases locally (for development purposes) and on various hosted or cloud server solutions (for staging or production purposes).

::: tip
Deploying **Strapi** itself is covered in the [Deployment Guide](../getting-started/deployment.md).
:::

## SQLite Installation

SQLite is the default ([Quick Start](../getting-started/quick-start.md)) and recommended database to quickly create an app locally.

### Install SQLite locally

As SQLite requires no additional software to be installed on your operating system you can simply use one of the following commands to create a Strapi project using a SQLite file. By default this file is created in `.tmp/data.db`.

:::: tabs

::: tab yarn

```bash
yarn create strapi-app my-project --quickstart
```

:::

::: tab npx

```bash
npx create-strapi-app my-project --quickstart
```

:::

::::

This will create a new project and launch it in the browser.

::: tip
The [Quick Start Guide](../getting-started/quick-start.md) is a complete step-by-step tutorial
:::

## PostgreSQL

### Install PostgreSQL locally

#### Install PostgreSQL on your development environment

If you already have PostgreSQL installed locally and running as a background service, you may skip to creating the user and database.

Please complete the installation steps appropriate to your operating system.

:::: tabs

::: tab "Windows 10"

##### Install PostgreSQL on Windows 10

Follow these steps to [install PostgreSQL onto your Windows 10](https://www.postgresql.org/download/windows/) environment:

1. Download the interactive installer for Windows [here](https://www.postgresql.org/download/windows/). Verify which version you need based on your platform, then follow the link to the installer page and download that version.
2. Run the installer and follow any install prompts.
3. After successfully installing PostgreSQL, the PostgreSQL service is started.

:::

::: tab "Mac OS"

##### Install PostgreSQL on Mac

Follow these steps to [install PostgreSQL onto your Mac](https://www.postgresql.org/download/macosx/) environment:

1. Download the interactive installer for Mac [here](https://www.postgresql.org/download/windows/). Verify which version you need based on your platform, then follow the link to the installer page and download that version.
2. Run the installer and follow any install prompts.
3. After successfully installing PostgreSQL, the PostgreSQL service is started.

:::

::: tab "Linux - Ubuntu"

##### Install PostgreSQL on Ubuntu

Follow these steps to [install PostgreSQL onto your Ubuntu](https://www.postgresql.org/download/linux/ubuntu/) environment:

1. Using the interactive documentation linked above, select your Ubuntu version (we will be using 18.04).
2. Add the apt repository:

```bash
echo "deb http://apt.postgresql.org/pub/repos/apt/ bionic-pgdg main" | sudo tee -a /etc/apt/sources.list.d/pgdg.list
```

3. Import the repository signing key:

```bash
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
```

4. Update your apt cache:

```bash
sudo apt update
```

5. Install the default default PostgreSQL package:

```bash
sudo apt install postgresql-12 -y
```

6. Confirm the PostgreSQL status:

```bash
systemctl status postgresql
```

:::

::::

#### Create a local PostgreSQL user and database for Strapi

<!-- Add tabs for commands on different OSes -->
blah blah blah

#### Install Strapi locally with PostgreSQL

Follow these steps to create a Strapi project locally using the PostgreSQL database.
::: tip
PostgreSQL must already be running in the background.
:::

1. Create a new Strapi project

:::: tabs

::: tab yarn

```bash
yarn create strapi-app my-project
```

:::

::: tab npx

```bash
npx create-strapi-app my-project
```

:::

::::

- Use your `down arrow` key and select `Custom (manual settings)` and press `enter`:

```bash
? Choose your installation type
  Quickstart (recommended)
❯ Custom (manual settings)
```

2. Select `Postgres` and press `enter`:

```bash
? Choose your installation type Custom (manual settings)
? Choose your main database:
  SQLite
  MongoDB
  MySQL
❯ Postgres
```

3. Press `enter` to select the remaining default options. It will look something like this:

```bash
? Choose your installation type Custom (manual settings)
? Choose your default database client postgres
? Database name: strapi
? Host: 127.0.0.1
? Port: 5432
? Username: strapi
? Password: ******
? Enable SSL connection: No
Creating a project with custom database options.
Creating files.
Dependencies installed successfully.
Your application was created at /home/dmehaffy/my-project.
Available commands in your project:
  yarn develop
  Start Strapi in watch mode.
  yarn start
  Start Strapi without watch mode.
  yarn build
  Build Strapi admin panel.
  yarn strapi
  Display all available commands.
You can start by doing:
  cd /home/dmehaffy/my-project
  yarn develop
```

You have successfully installed Strapi with PostgreSQL on your local development environment. You are now ready to [create your first user](../getting-started/quick-start.md#_3-create-an-admin-user).

## MySQL/MariaDB

### Install MySQL/MariaDB locally

#### Install MySQL/MariaDB on your development environment

If you already have MySQL or MariaDB installed locally and running as a background service, you may skip to creating the user and database.

::: tip

MariaDB is a free and open source drop in replacement for Oracle's MySQL. Where possible, it is recommended to use MariaDB instead of MySQL to promote other open source software like Strapi.

:::

Please complete the installation steps appropriate to your operating system.

:::: tabs

::: tab "Windows 10 - MySQL"

##### Install MySQL on Windows 10

Follow these steps to [install MySQL onto your Windows 10]() environment:

1. Download the interactive installer for Windows [here](). Verify which version you need based on your platform, then follow the link to the installer page and download that version.
2. Run the installer and follow any install prompts.
3. After successfully installing MySQL, the MySQL service is started.

:::

::: tab "Windows 10 - MariaDB"

##### Install MariaDB on Windows 10

Follow these steps to [install MariaDB onto your Windows 10]() environment:

1. Download the interactive installer for Windows [here](). Verify which version you need based on your platform, then follow the link to the installer page and download that version.
2. Run the installer and follow any install prompts.
3. After successfully installing MariaDB, the MariaDB service is started.

:::

::: tab "Mac OS - MySQL"

##### Install MySQL on Mac OS

Follow these steps to [install MySQL onto your Mac]() environment:

1. Download the interactive installer for Mac [here](). Verify which version you need based on your platform, then follow the link to the installer page and download that version.
2. Run the installer and follow any install prompts.
3. After successfully installing MySQL, the MySQL service is started.

:::

::: tab "Mac OS - MariaDB"

##### Install MariaDB on Mac OS

Follow these steps to [install MariaDB onto your Mac]() environment:

1. Download the interactive installer for Mac [here](). Verify which version you need based on your platform, then follow the link to the installer page and download that version.
2. Run the installer and follow any install prompts.
3. After successfully installing MariaDB, the MariaDB service is started.

:::

::: tab "Ubuntu - MySQL"

##### Install MySQL on Ubuntu

Follow these steps to [install MySQL onto your Ubuntu]() environment:

1. Using the interactive documentation linked above, select your Ubuntu version (we will be using 18.04).

2. Add the apt repository:

```bash
echo ""
```

3. Import the repository signing key:

```bash
wget --quiet -O -
```

4. Update your apt cache:

```bash
sudo apt update
```

5. Install the default default MySQL package:

```bash
sudo apt install -y
```

6. Confirm the MySQL status:

```bash
systemctl status mysql
```

:::

::: tab "Ubuntu - MariaDB"

##### Install MariaDB on Ubuntu

Follow these steps to [install MariaDB onto your Ubuntu]() environment:

1. Using the interactive documentation linked above, select your Ubuntu version (we will be using 18.04).

2. Add the apt repository:

```bash
echo ""
```

3. Import the repository signing key:

```bash
wget --quiet -O -
```

4. Update your apt cache:

```bash
sudo apt update
```

5. Install the default default MySQL package:

```bash
sudo apt install -y
```

6. Confirm the MySQL status:

```bash
systemctl status mariadb
```

:::

::::

#### Create a local MySQL/MariaDB user and database for Strapi

<!-- Add tabs for commands on different OSes -->
blah blah blah

#### Install Strapi locally with MySQL/MariaDB

Follow these steps to create a Strapi project locally using the MySQL database.

::: tip
MySQL must already be running in the background.
:::

1. Create a new Strapi project

:::: tabs

::: tab yarn

```
yarn create strapi-app my-project
```

:::

::: tab npx

```
npx create-strapi-app my-project
```

:::

::::

2. Use your `down arrow` key and select `Custom (manual settings)` and press `enter`:

```bash
? Choose your installation type
  Quickstart (recommended)
❯ Custom (manual settings)
```

3. Select `Postgres` and press `enter`:

```bash
? Choose your installation type Custom (manual settings)
? Choose your main database:
  SQLite
  MongoDB
❯ MySQL
  Postgres
```

- Press `enter` to select the remaining default options. It will look something like this:

```bash
? Choose your installation type Custom (manual settings)
? Choose your default database client mysql
? Database name: strapi
? Host: 127.0.0.1
? Port: 3306
? Username: strapi
? Password: ******
? Enable SSL connection: No
Creating a project with custom database options.
Creating files.
Dependencies installed successfully.
Your application was created at /home/dmehaffy/my-project.
Available commands in your project:
  yarn develop
  Start Strapi in watch mode.
  yarn start
  Start Strapi without watch mode.
  yarn build
  Build Strapi admin panel.
  yarn strapi
  Display all available commands.
You can start by doing:
  cd /home/dmehaffy/my-project
  yarn develop
```

You have successfully installed Strapi with MySQL on your local development environment. You are now ready to [create your first user](../getting-started/quick-start.md#_3-create-an-admin-user).

## MongoDB Installation

### Install MongoDB locally

#### Install MongoDB on your development environment

If you already have MongoDB installed locally and running as a background service, you may skip to [Install Strapi locally with MongoDB](#install-strapi-locally-with-mongodb). (If you have additional questions, please see the official [MongoDB documentation](https://docs.mongodb.com/manual/installation/#tutorial-installation). )

Please complete the installation steps appropriate to your operating system.

:::: tabs

::: tab "Windows 10"

#### Install MongoDB on Windows 10

Follow these steps to [install MongoDB onto your Windows 10](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/) environment (The Windows Sub-System for Linux (WSL) is unsupported by MongoDB):

1. Download the `MongoDB Community Edition Server` for Windows [here](https://www.mongodb.com/download-center/community?jmp=docs). Select `MongoDB Community Server` and verify the options that match your computer. Then `Download` the package and follow the installation instructions to complete the process.

2. After successfully installing MongoDB, the MongoDB service is started. To begin using MongoDB, connect a mongo.exe shell to the running MongoDB instance.

```bash
"C:\Program Files\MongoDB\Server\4.0\bin\mongo.exe"
```

You can exit the MongoDB shell with `CTRL + C`.

You have now installed MongoDB for _Windows 10_. You are now ready to [install Strapi with MongoDB locally](#install-strapi-with-mongodb).

:::

::: tab "Mac O/S"

#### Install MongoDB on Mac

Follow these steps to [install MongoDB onto your Mac](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/) developer environment:

1. Use `brew` to tap the official MongoDB formula repository and add it to the formula list:

```bash
brew tap mongodb/brew
```

2. Now install MongoDB

```bash
brew install mongodb-community@4.0
```

3. Get the mongod process running in order to connect and use MongoDB:

```bash
mongod --config /usr/local/etc/mongod.conf
```

You have now installed MongoDB for _Mac_. You are now ready to [install Strapi with MongoDB locally](#install-strapi-with-mongodb).

:::

::: tab "Ubuntu"

#### Install MongoDB on Ubuntu

Follow these steps to [install MongoDB onto your Ubuntu](https://docs.mongodb.com/manual/administration/install-on-linux/) environment:

1. Import a public key to ensure your MongoDB is authentic:

```bash
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
```

2. Next, add the repository for 18.04. Repositories for other versions of Ubuntu are found [here](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/).

```bash
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
```

3. Reload the local package database:

```bash
sudo apt-get update
```

4. Install the stable release MongoDB package

```bash
sudo apt-get install -y mongodb-org
```

5. Get the `mongod` process running in order to connect and use MongoDB:

```bash
sudo service mongod start
```

6. Confirm the MongoDB status:

```bash
service mongod status
```

7. The last step is to enable automatically starting MongoDB when your computer boots:

```bash
sudo systemctl enable mongod
```

You have now installed MongoDB for _Linux_. You are now ready to [install Strapi with MongoDB locally](#install-strapi-with-mongodb).

:::

::::

#### Install Strapi locally with MongoDB

Follow these steps to create a Strapi project locally using the MongoDB database.

::: tip
MongoDB must already be running in the background.
:::

1. Create a new Strapi project

`Path: ./`

:::: tabs

::: tab yarn

```
yarn create strapi-app my-project
```

:::

::: tab npx

```
npx create-strapi-app my-project
```

:::

::::

- Use your `down arrow` key and select `Custom (manual settings)` and press `enter`:

```bash
? Choose your installation type
  Quickstart (recommended)
❯ Custom (manual settings)
```

- Select `MongoDB` and press `enter`:

```bash
? Choose your installation type Custom (manual settings)
? Choose your main database:
  SQLite
❯ MongoDB
  MySQL
  Postgres
```

- Press `enter` to select the remaining default options. It will look something like this:

```bash

? Choose your installation type Custom (manual settings)
? Choose your main database: MongoDB
? Database name: my-project
? Host: 127.0.0.1
? +srv connection: false
? Port (It will be ignored if you enable +srv): 27017
? Username:
? Password:
? Authentication database (Maybe "admin" or blank):
? Enable SSL connection: false

⏳ Testing database connection...
The app has been connected to the database successfully!

🏗  Application generation:
✔ Copy dashboard
✔ Installed dependencies.

👌 Your new application my-project is ready at /Users/david/Desktop/Projects/my-project.

⚡️ Change directory:
$ cd my-project

⚡️ Start application:
$ strapi develop

```

You have successfully installed Strapi with MongoDB on your local development environment. You are now ready to [create your first user](../getting-started/quick-start.md#_3-create-an-admin-user).

---

### Install on Atlas: MongoDB Atlas

Follow these steps to configure a local Strapi project to use a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free 512 MB account in production. (Please see [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/getting-started/) if you have any questions.)

- You must have already [created your Strapi project using MongoDB](databases.md#install-strapi-locally-with-mongodb).
- You must have already created a [free MongoDB Atlas account](https://www.mongodb.com/cloud/atlas).

#### Log in to your account to create a **Project** and a **Cluster**

- First you need to `Create a new Project`.
- Then click `Build a Cluster`, from the options page:
  - Choose **AWS** as your **Cloud Provider & Region**.
  - Select a **Region**. (Note: some **Regions** do not have a _free tier_.)
  - In **Cluster Tier**, select **Shared Sandbox**, _Tier_ `MO`.
  - In **Cluster Name**, name your cluster.
- Click the green `Create Cluster` button. You will get a message that says, "_Your cluster is being created..._"

#### Next, click on the `Database Access` in the left menu (under `Overview`):

- Click the green `+ ADD NEW USER` button:
  - Enter a `username`.
  - Enter a `password`.
  - Under `User Privileges` ensure **`Read and write to any database`** is selected. Then click `Add User` to save.

#### Then `whitelist` your IP address. Click into `Network Access`, under `Security` in the left menu:

- Click the green `+ ADD IP ADDRESS`

  - Click `ADD CURRENT IP ADDRESS` or **manually** enter in an IP address to `whitelist`.
  - Leave a comment to label this IP Address. E.g. `Office`.
  - Then click the green `Confirm` button.
  - Delete the `0.0.0.0/0` configuration after testing the connection.

  ::: tip
  If for any reason you need to test the configuration or other aspect of your connection to the database, you may want to set back the `Allow Access from Anywhere`. Follow this steps:
  :::

  - Click the green `+ ADD IP ADDRESS`
    - Next add `0.0.0.0/0` in the `Whitelist Entry`. **Note:** In permanent projects you would configure this with the appropriate IP addresses.
    - Leave a comment to label this IP Address. E.g. `Anywhere`.
    - Click `Confirm`. Then wait until the status turns from `Pending` to `Active`.

  ::: tip
  If you are serving you Strapi project from a known IP Address then follow the following steps to `allow Network Access`.
  :::

  - **Manually** enter in an IP address to `whitelist`, for your Strapi server.
  - Leave a comment to label this IP Address. E.g. `Heroku Server`
  - Then click the green `Confirm` button.

#### Retrieve database credentials

MongoDB Atlas automatically exposes the database credentials into a single environment variable accessible by your app. To locate it, follow these steps:

- Under `Atlas` in the left-hand, click on `Clusters`. This should take you to your `cluster`. Next, click `CONNECT` and then `Connect Your Application`.
- Under `1. Choose your driver version`, select **DRIVER** as `Node.js` and **VERSION** as `2.2.12 or later`.
  ::: warning
  You **must** use `Version: 2.2.12 or later`.
  :::
- This should show a **Connection String Only** similar to this:

`mongodb://paulbocuse:<password>@strapi-heroku-shard-00-00-oxxxo.mongodb.net:27017,strapi-heroku-shard-00-01-oxxxo.mongodb.net:27017,strapi-heroku-shard-00-02-oxxxo.mongodb.net:27017/test?ssl=true&replicaSet=Strapi-Heroku-shard-0&authSource=admin&retryWrites=true&w=majority`

::: warning
Please note the `<password>` after your `username`. In this example, after `mongodb://paulbocuse:`. You will need to replace the `<password>` with the password you created earlier for this user in your **MongoDB Atlas** account.
:::

#### Update and replace your existing `/database.js` config file for the appropriate environment (development | production).

Replace the contents of `/database.json` with the following and replace **< password >** with the password of the user of your database you created earlier:

`Path: ./config/database.js`.

```js
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      settings: {
        uri: env('DATABASE_URI'),
      },
      options: {
        ssl: true,
      },
    },
  },
});
```

`Path: .env`

```
DATABASE_URI=mongodb://paulbocuse:<password>@strapidatabase-shard-00-00-fxxx6c.mongodb.net:27017,strapidatabase-shard-00-01-fxxxc.mongodb.net:27017,strapidatabase-shard-00-02-fxxxc.mongodb.net:27017/test?ssl=true&replicaSet=strapidatabase-shard-0&authSource=admin&retryWrites=true&w=majority
```

::: warning NOTE
The above configuration will create a database called `strapi`, the _default database_ Strapi sets for any **MongoDB** database. If you would like to name your database something else, add the following **key:value pair** into your **settings:** located in your `database.js` file.

`database: "my-database-name"`

:::

::: danger WARNING
We recommend replacing sensitive (eg. "URI string" above) information in your database configuration files before uploading your project to a public repository such as GitHub. For more information about using environment variables, please read [configurations](../concepts/configurations.md).

:::

You are now ready use Strapi locally or to deploy your project to an external hosting provider and use MongoDB Atlas as your database server.
