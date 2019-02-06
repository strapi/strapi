# Installation Requirements

### 👋 Welcome onboard!

Welcome to the open source [headless CMS](https://strapi.io) developers love. Our users love Strapi because it is open source, MIT licensed, fully customizable and based on nodejs. Strapi lets you manage your content and distribute it anywhere.

This page covers installing the [basic installation requirements for Strapi](#basic-installation-requirements).

(After you install these requirements, the [Quick Start](/3.x.x/getting-started/quick-start.html) guide will walk you through how to: [create a project](quick-start.html#_1-create-a-project), [create an admin user](quick-start.html#_2-create-an-admin-user), [create a content type](quick-start.html#_3-create-a-content-type), [manage and add data to content type](quick-start.html#_4-manage-and-add-data-to-content-type), [set roles and permissions](quick-start.html#_5-set-roles-and-permissions) and [consume the content type API](quick-start.html#_6-consume-the-content-type-api).)

## Basic Installation Requirements

Strapi requires just two basic installation steps:

1. Install [Node.js](https://nodejs.org). We recommend using version 10.x or later.
2. Install [Strapi](https://strapi.io). Install the latest version of Strapi.

These two requirements are all that is needed to get Strapi up and running on your development environment.

## Install Node (and NPM)

Strapi needs Nodejs and NPM installed. NPM installs at the same time as Nodejs. You can following the below instructions to install Nodejs on Windows 10, Ubuntu 18.04 and Mac O/S Mojave.

#### Installation Instructions for each Operating System:

::: windows
**WINDOWS 10**

### Install Node.js (and NPM) on Windows 10

There are several methods to install Nodejs on _Windows 10_.

We will follow the most common download and installation procedure. These _instructions are for Windows 10_. (If you are installing on a different version of Windows or if you have trouble following these instructions, please review the [official Nodejs documentation](https://nodejs.org/en/docs/).)

1. Download the Windows Installer from the [downloads page](https://nodejs.org/en/download/). You will need to choose the 32-bit or 64-bit version. We recommend the LTS (long-term support) version of Nodejs.
2. Double-click the node-v10.x.x-x86.msi file icon. Click "Next" for the default options and to install Nodejs under the recommended and most common settings. After clicking "Next" several times, click "Install" to install nodejs. When it is done installing, click "Finish".
3. Verify both Nodejs and NPM have installed correctly. Open your Command Prompt:
   - Click your Start Button
   - In Search type, "cmd"
   - Then click on "Command Prompt".
   - Type the following commands in your Command Prompt

Verify Nodejs has correctly installed:

```shell
$ node -v
## You should see "v10.x.x
```

Next, verify NPM has correctly installed:

```shell
$ npm -v
## You should see "6.x.x"
```

All done. Next you need to [install Strapi globally](#install-strapi-globally).
:::

::: mac
**MAC O/S 10.14 MOJAVE**

### Install Node.js (and NPM) on Mac O/S X (Mojave)

There are multiple methods to install Nodejs on _Mac O/S X (Mojave)_.

We will follow the most common download and installation procedure. _These instructions are for Mac O/S X (Mojave)_. (If you are installing on a different version of Mac O/S or if you have trouble following these instructions, please review the [official Nodejs documentation](https://nodejs.org/en/docs/).)

1. Download the Mac O/S Installer from the [downloads page](https://nodejs.org/en/download/). We recommend the LTS (long-term support) version of Nodejs.
2. Launch the node-v10.x.x.pkg file icon. Click "Continue" for the default options and to install Nodejs under the recommended and most common settings. After clicking "Continue" several times, click "Install" to install nodejs. When it is done installing, click "Close".
3. Verify both Nodejs and NPM have installed correctly. Open your terminal prompt:
   - Open you Applications folder
   - FInd and open the Utilities folder
   - Find "Terminal" and click on it to open it.
   - Type the following commands in your Terminal

Verify Nodejs has correctly installed:

```terminal
$ node -v
## You should see "v10.x.x"
```

Next, verify NPM has correctly installed:

```terminal
$ npm -v
## You should see "6.x.x"
```

All done. Next you need to [install Strapi globally](#install-strapi-globally).
:::

::: ubuntu

**UBUNTU 18.04**

### Install Node.js (and NPM) on Ubuntu 18.04

There are multiple methods to install Nodejs on _Ubuntu 18.04_.

We will follow the most common download and installation procedure. _These instructions are for Ubuntu 18.04_. (If you are installing on a different version of Ubuntu or a different Linux Distro or if you have trouble following these instructions, please review the [official Nodejs documentation](https://nodejs.org/en/docs/).)

1. Install cURL and use cURL to download the nodejs (and NPM) source code

```bash
$ sudo apt-get install curl
$ curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
```

2. Install nodejs (and NPM)

```bash
$ sudo apt-get install -y nodejs
```

Verify Nodejs has correctly installed:

```bash
$ node -v
## You should see "v10.x.x"
```

Next, verify NPM has correctly installed:

```bash
$ npm -v
## You should see "6.x.x"
```

All done. Next you need to [install Strapi globally](#install-strapi-globally).
:::

## Install Strapi globally

Time to install Strapi!

We will now install Strapi. Strapi installs with one command. The command is the same for Windows, Mac or Ubuntu.
::: danger WARNING
Strapi must be installed globally, using the "-g" flag, to avoid problems.
:::

```bash
$ npm install strapi@alpha -g
```

::: warning NOTE
If you encounter npm permissions issues, [change the permissions to npm default directory](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-1-change-the-permission-to-npms-default-directory).
:::

(Installation takes about 20 seconds with a good Internet connection. Take a coffee ☕️ break if your internet is slow.)

### Check installation

Once completed, verify Strapi is correctly installed, type:

```bash
$ strapi -v
## You should see "3.0.0-alpha.x"
```

Strapi is now installed globally on your computer. Type `strapi -h` in your command line to access available Strapi commands.

```bash
$ strapi -h

## You will get the following available commands
Usage: strapi [options] [command]

Options:
  -v, --version                                  output the version number
  -h, --help                                     output usage information

Commands:
  version                                        output your version of Strapi
  console                                        open the Strapi framework console
  new [options]                                  create a new application
  start [appPath]                                start your Strapi application
  generate:api [options] <id> [attributes...]    generate a basic API
  generate:controller [options] <id>             generate a controller for an API
  generate:model [options] <id> [attributes...]  generate a model for an API
  generate:policy [options] <id>                 generate a policy for an API
  generate:service [options] <id>                generate a service for an API
  generate:plugin [options] <id>                 generate a basic plugin
  install [options] <plugin>                     install a Strapi plugin
  uninstall <plugin>                             uninstall a Strapi plugin
  help                                           output the help
  *
```

Are you having trouble during the basic installation steps? Please check to see if someone already had the [same issue](https://github.com/strapi/strapi/issues). If not, please [submit an issue](https://github.com/strapi/strapi/issues/new).

---

::: tip NEXT STEPS
👏 Congrats, you are all set! Now that Strapi is installed you can proceed to the [Quick start](/3.x.x/getting-started/quick-start.html) and [create a project](quick-start.md#_1-create-a-project).
:::
