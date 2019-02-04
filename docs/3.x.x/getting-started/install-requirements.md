# Install Requirements

### 👋 Welcome onboard!

Welcome to the open source [headless CMS](https://strapi.io) front-end developers love. Our users love Strapi because it is open source, MIT licensed, fully customizable and based on nodejs. Strapi lets you manage your content and distribute it anywhere.

This page covers installing the [Basic installation requirements for Strapi](#basic-installation-requirements). After you install these requirements, the [Quick Start](/3.x.x/getting-started/quick-start.html) guide will walk you through how-to create your first project, create a content type, populate the content type, set permissions and consume the content type API.

## Basic Installation Requirements

Using Strapi requirements just two basic installation requirements:

1. [Node.js](https://nodejs.org). We recommend using version 10.x or later.
2. [Strapi](https://strapi.io). Install the latest version of Strapi.

These two requirements are all that is needed to get Strapi up and running on your development environment.

### Installing Node

Strapi needs Nodejs and NPM installed. NPM installs at the same time as Nodejs. You can following the below instructions to install Nodejs on Windows 10, Ubuntu 18.04 and Mac O/S Mojave.

### Install Node.js on Windows 10

There are several methods to install Nodejs on **Windows 10**. We will follow the most common download and installation procedure. These _instructions are for Windows 10_. If you are installing on a different version of Windows or if you have trouble following these instructions, please review the [official Nodejs documentation](https://nodejs.org/en/docs/).

1. Download the Windows Installer from the [downloads page](https://nodejs.org/en/download/). You will need to choose the 32-bit or 64-bit version. Additionally, we recommend the LTS (long-term support) version of Nodejs.
2. Double-click the node-v10.x.x-x86.msi file icon and by clicking "Next" for the default options will install Nodejs under the recommended and most common settings. After clicking "Next" several times, click "Install" to install nodejs. When it is done, click "Finish".
3. Verify both Nodejs and NPM have installed correctly. Open your command prompt. A. Click your Start Button, in Search type, "CMD", and then click on "Command Prompt". Type the following commands in your Command Prompt:

```bash
$ node -v
```

You should see the v10.x.x

```bash
$ npm -v
```

You should see v6.x.x

If you see the versions above, you have successfully installed Nodejs and NPM on Windows 10.

### Install Node.js on Mac O/S X (Mojave)

There are multiple methods to install Nodejs on **Mac O/S X (Mojave)**. We will follow the most common download and installation procedure. _These instructions are for Mac O/S X (Mojave)_. If you are installing on a different version of the Mac O/S or if you have trouble following these instructions, please review the [official Nodejs documentation](https://nodejs.org/en/docs/).

1. Download the Mac O/S Installer from the [downloads page](https://nodejs.org/en/download/). We recommend the LTS (long-term support) version of Nodejs.
2. Launch the node-v10.x.x.pkg file icon and by clicking "Continue" for the default options will install Nodejs under the recommended and most common settings. After clicking "Continue" several times, click "Install" to install nodejs. When it is done, click "Close".
3. Verify both Nodejs and NPM have installed correctly. Open your command prompt. A. Open you Applications folder, then Utilities folder. Find "Terminal" and click on it to open it.
   Type the following commands in your Terminal:

```bash
$ node -v
```

You should see the v10.x.x

```bash
$ npm -v
```

You should see v6.x.x

### Install Node.js on Ubuntu 18.04

If you see the versions above, you have successfully installed Nodejs and NPM on Windows 10.

Please make sure your computer/server meets the following requirements:

- [Node.js](https://nodejs.org) >= 10.x: Node.js is a server platform which runs JavaScript. Installation guide [here](https://nodejs.org/en/download/).
- [NPM](https://www.npmjs.com/) >= 6.x: NPM is the package manager for Javascript. Installation guide [here](https://nodejs.org/en/download/).
  _(Make sure the database that you are using meets the requirement.)_
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

It takes about 20 seconds with a good Internet connection. You can take a coffee ☕️ break if your internet is slow.

Having troubles during the installation? Check if someone already had the [same issue](https://github.com/strapi/strapi/issues). If not, please [submit an issue](https://github.com/strapi/strapi/issues/new).

## Check installation

Once completed, please check that the installation went well, by running:

```bash
strapi -v
```

That should print `3.0.0-alpha.x`.

Strapi is installed globally on your computer. Type `strapi` in your terminal you will have access to every available command lines.

---

👏 Congrats, you are all set! Now that Strapi is installed you can [create your first project](quick-start.md).
