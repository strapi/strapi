# Installation

### 👋 Welcome onboard!

You recently discovered Strapi and look forward to give it a try? Let's start with the installation!  

## Requirements

Please make sure your computer/server meets the following requirements:
 - [Node.js](https://nodejs.org) >= 10.x: Node.js is a server platform which runs JavaScript. Installation guide [here](https://nodejs.org/en/download/).
 - [NPM](https://www.npmjs.com/) >= 6.x: NPM is the package manager for Javascript. Installation guide [here](https://nodejs.org/en/download/).
*(Make sure the database that you are using meets the requirement.)*
 - The database of your choice:
   - [MongoDB](https://www.mongodb.com/) >= 3.x: MongoDB is a powerful document store. Installation guide [here](https://www.mongodb.com/download-center?j#community).
   - [MySQL](https://www.mysql.com/) >= 5.6: MySQL is an open-source relational database management system. Installation guide [here](https://dev.mysql.com/downloads/).
   - [MariaDB](https://mariadb.org/) >= 10.1: MariaDB is a fork of MySQL and is guaranteed to stay open source. Installation guide [here](https://mariadb.org/download/).
   - [PostgreSQL](https://www.postgresql.org/) >= 10: PostgreSQL is an open-source object-relational database management system. Installation guide [here](https://www.postgresql.org/download/).

## Setup

Time to install Strapi!

```bash
npm install strapi@alpha -g
```

::: note
If you encounter npm permissions issues, [change the permissions to npm default directory](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-1-change-the-permission-to-npms-default-directory).
:::

It takes about 20 seconds with a good Internet connection. You can take a coffee ☕️  if you have a slow one.

Having troubles during the installation? Check if someone already had the [same issue](https://github.com/strapi/strapi/issues). If not, please [post one](https://github.com/strapi/strapi/issues/new).

## Check installation

Once completed, please check that the installation went well, by running:

```bash
strapi -v
```

That should print `3.0.0-alpha.x`.

Strapi is installed globally on your computer. Type `strapi` in your terminal you will have access to every available command lines.

***

👏 Congrats, you are all set! Now that Strapi is installed you can [create your first project](quick-start.md).
