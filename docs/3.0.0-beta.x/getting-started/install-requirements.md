# Installation Requirements

This page covers installing the basic requirements for Strapi.

## Basic Installation Requirements

Strapi only requires [Node.js](https://nodejs.org). The current recommended version to run strapi is `Node v10` (current `LTS`).

This is all that is needed before Strapi can run on your local environment.

## Installing Node.js

You can install `Node.js` and `npm` for `Windows 10`, `Ubuntu 18.04` and `Mac O/S Mojave` with the following instructions.

#### Installation Instructions for each Operating System:

::: windows
**WINDOWS 10**

### Installing Node.js on Windows 10

There are several methods to install Node.js on _Windows 10_.

We will follow the most common download and installation procedure. These _instructions are for Windows 10_. (If you are installing on a different version of Windows or if you have trouble following these instructions, please review the [official Node.js documentation](https://nodejs.org/en/docs/).)

1. Download the Windows Installer from the [downloads page](https://nodejs.org/en/download/). You will need to choose the 32-bit or 64-bit version. We recommend the LTS (long-term support) version of Nodejs.
2. Double-click the node-v10.x.x-x86.msi file icon. Click "Next" for the default options and to install Nodejs under the recommended and most common settings. After clicking "Next" several times, click "Install" to install node.js. When it is done installing, click "Finish".
3. Verify both Node.js and npm have installed correctly. Open your Command Prompt:
   - Click your Start Button
   - In Search type, "cmd"
   - Then click on "Command Prompt".
   - Type the following commands in your Command Prompt

Verify Node.js has correctly installed:

```shell
node -v
## You should see "v10.x.x
```

Next, verify npm has correctly installed:

```shell
npm -v
## You should see "6.x.x"
```

:::

::: mac
**MAC O/S 10.14 MOJAVE**

### Installing Node.js on Mac O/S X (Mojave)

There are multiple methods to install Node.js on _Mac O/S X (Mojave)_.

We will follow the most common download and installation procedure. _These instructions are for Mac O/S X (Mojave)_. (If you are installing on a different version of Mac O/S or if you have trouble following these instructions, please review the [official Nodejs documentation](https://nodejs.org/en/docs/).)

1. Download the Mac O/S Installer from the [downloads page](https://nodejs.org/en/download/). We recommend the LTS (long-term support) version of Nodejs.
2. Launch the node-v10.x.x.pkg file icon. Click "Continue" for the default options and to install Nodejs under the recommended and most common settings. After clicking "Continue" several times, click "Install" to install node.js. When it is done installing, click "Close".
3. Verify both Node.js and npm have installed correctly. Open your terminal prompt:
   - Open you Applications folder
   - Find and open the Utilities folder
   - Find "Terminal" and click on it to open it.
   - Type the following commands in your Terminal

Verify Node.js has correctly installed:

```terminal
node -v
## You should see "v10.x.x"
```

Next, verify npm has correctly installed:

```terminal
npm -v
## You should see "6.x.x"
```

:::

::: ubuntu

**UBUNTU 18.04**

### Installing Node.js on Ubuntu 18.04

There are multiple methods to install Node.js on _Ubuntu 18.04_.

We will follow the most common download and installation procedure. _These instructions are for Ubuntu 18.04_. (If you are installing on a different version of Ubuntu or a different Linux Distro or if you have trouble following these instructions, please review the [official Nodejs documentation](https://nodejs.org/en/docs/).)

1. Install cURL and use cURL to download the nodejs (and npm) source code

```bash
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
```

2. Install node.js (and npm)

```bash
sudo apt-get install -y nodejs
```

Verify Node.js has correctly installed:

```bash
node -v
## You should see "v10.x.x"
```

Next, verify npm has correctly installed:

```bash
npm -v
## You should see "6.x.x"
```

:::

### Using Yarn

You can also use yarn if you want [Here](https://yarnpkg.com/en/docs/getting-started) are the instructions to get started with it.

::: tip NEXT STEPS
👏 Congrats, you are all set! Now that Node.js is installed you can continue with the [Quick start guide](/3.0.0-beta.x/getting-started/quick-start.html).
:::
