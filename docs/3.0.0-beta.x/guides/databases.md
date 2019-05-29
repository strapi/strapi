# Databases

Strapi gives you the option to choose the most appropriate database for your project. It currently supports **PostgreSQL**, **MongoDB**, **SQLite**, **MySQL** and
**MariaDB**. The following documentation covers how to install these databases locally (for development purposes) and on various hosted or cloud server solutions (for staging or production purposes).

(Deploying **Strapi** itself is covered in the [Deployment Guide](/3.0.0-beta.x/guides/deployment.html).)

**Table of contents:**

- [SQLite Installation](#sqlite-installation)
- [MongoDB Installation](#mongodb-installation)

---

## SQLite Installation

SQLite is the default ([Quick Start](/3.0.0-beta.x/getting-started/quick-start.html)) and recommended database to quickly create an app locally.

### Install SQLite locally

Simply use the `strapi new my-project --quickstart` command.

```bash
strapi new my-project --quickstart
```

This will create a new project and launch it in the browser. (The [Quick Start Guide](/3.0.0-beta.x/getting-started/quick-start.html) is a complete step-by-step tutorial.)

## MongoDB Installation

### Install MongoDB locally

In order to use Strapi with [MongoDB](https://www.mongodb.com/) in production, you must have and use MongoDB on your local development environment. These instructions show how to start using Strapi with a MongoDB database.

- You must have [Strapi installed globally](/3.0.0-beta.x/getting-started/quick-start-tutorial.html#_1-install-strapi-globally).

### 1. Install MongoDB on your development environment

If you already have MongoDB installed locally and running as a background service, you may skip to [Install Strapi locally with MongoDB](#install-strapi-locally-with-mongodb). (If you have additional questions, please see the official [MongoDB documentation](https://docs.mongodb.com/manual/installation/#tutorial-installation). )

Please complete the installation steps appropriate to your operating system.

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "Windows 10" id="windows-mongodb"

### Install MongoDB on Windows 10

Follow these steps to [install MongoDB onto your Windows 10](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/) environment (The Windows Sub-System for Linux (WSL) is unsupported by MongoDB):

1. Download the `MongoDB Community Edition Server` for Windows [here](https://www.mongodb.com/download-center/community?jmp=docs). Select `MongoDB Community Server` and verify the options that match your computer. Then `Download` the package and follow the installation instructions to complete the process.

2. After successfully installing MongoDB, the MongoDB service is started. To begin using MongoDB, connect a mongo.exe shell to the running MongoDB instance.

```bash
"C:\Program Files\MongoDB\Server\4.0\bin\mongo.exe"
```

You can exit the MongoDB shell with `CTRL + C`.

You have now installed MongoDB for _Windows 10_. You are now ready to [install Strapi with MongoDB locally](#install-strapi-with-mongodb).

:::

::: tab "Mac O/S 10.14 Mojave" id="mac-mongodb"

### Install MongoDB on Mac

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

::: tab "Ubuntu 18.04" id="ubuntu-mongodb"

### Install MongoDB on Ubuntu

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

### 2. Install Strapi locally with MongoDB

Follow these steps to create a Strapi project locally using the MongoDB database.

**Note:** MongoDB must already be running in the background.

1. Create a new Strapi project

`Path: ./`

```bash
strapi new my-project
```

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

You have successfully installed Strapi with MongoDB on your local development environment. You are now ready to [create your first user](/3.0.0-beta.x/getting-started/quick-start.html#_3-create-an-admin-user).

---

### Install on Atlas: MongoDB Atlas

Follow these steps to configure a local Strapi project to use a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free 512 MB account in production. (Please see [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/getting-started/) if you have any questions.)

- You must have already [created your Strapi project using MongoDB](/3.0.0-beta.x/guides/databases.html#install-strapi-locally-with-mongodb).
- You must have already created a [free MongoDB Atlas account](https://www.mongodb.com/cloud/atlas).

1. Log in to your account to create a **Project** and a **Cluster**

- First you need to `Create a new Project`.
- Then click `Build a Cluster`, from the options page:
  - Choose **AWS** as your **Cloud Provider & Region**.
  - Select a **Region**. (Note: some **Regions** do not have a _free tier_.)
  - In **Cluster Tier**, select **Shared Sandbox**, _Tier_ `MO`.
  - In **Cluster Name**, name your cluster.
- Click the green `Create Cluster` button. You will get a message that says, "_Your cluster is being created..._"

2. Next, click on the `Security` tab (next to `Overview`):

- Click the green `+ ADD NEW USER` button:
  - Enter a `username`.
  - Enter a `password`.
  - Under `User Privileges` ensure **`Read and write to any database`** is selected. Then click `Add User` to save.

3. Then `whitelist` your IP address. Under `Security`, click to `IP Whitelist`

- Click the green `+ ADD IP ADDRESS`
  - Next click `ALLOW ACCESS FROM ANYWHERE`. **Note:** In permanent projects you would configure this with the appropriate IP addresses.
  - Click `Confirm`. Then wait until the status turns from `Pending` to `Active`.

4. Retrieve database credentials

MongoDB Atlas automatically exposes the database credentials into a single environment variable accessible by your app. To locate it, follow these steps:

- Under the `Overview` tab, click `CONNECT` and then `Connect Your Application`.
- Under `1. Choose your driver version`, select **DRIVER** as `Node.js` and **VERSION** as `2.2.12 or later`.
- This should show a **Connection String Only** similar to this:

`mongodb://paulbocuse:<password>@strapi-heroku-shard-00-00-o777o.mongodb.net:27017,strapi-heroku-shard-00-01-o606o.mongodb.net:27017,strapi-heroku-shard-00-02-o606o.mongodb.net:27017/test?ssl=true&replicaSet=Strapi-Heroku-shard-0&authSource=admin&retryWrites=true`

- You are interested in everything **AFTER** the **@** symbol. This is your **Database Host** variable. So in this case,

`strapi-heroku-shard-00-00-o777o.mongodb.net:27017,strapi-heroku-shard-00-01-o606o.mongodb.net:27017,strapi-heroku-shard-00-02-o606o.mongodb.net:27017/test?ssl=true&replicaSet=Strapi-Heroku-shard-0&authSource=admin&retryWrites=true`\_

- You created earlier a `cluster name`, `username` and `password`. These are the other variables needed to configure your project to connect to MongoDB Atlas.

Keep these five MongoDB Atlas database variables from your MongoDB Atlas account ready and available.

5. Update your database config file

Replace the contents of `database.json` with the following:

`Path: ./config/environments/(development|production)/database.json`.

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "strapi-hook-mongoose",
      "settings": {
        "client": "mongo",
        "host": "cluster0-shard-00-00-y8imj.mongodb.net:27017,cluster0-shard-00-01-y8imj.mongodb.net:27017,cluster0-shard-00-02-y8imj.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true",
        "port": 27017,
        "database": "test",
        "username": "john",
        "password": "doe"
      },
      "options": {
        "ssl": true
      }
    }
  }
}
```

You are now ready use Strapi locally or to deploy your project to an external hosting provider and use MongoDB Atlas as your database server.
