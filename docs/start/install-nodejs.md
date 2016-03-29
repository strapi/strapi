---
title: Install Node.js
---

## New to Node.js ?

> Node.js® is a JavaScript runtime built on Chrome's V8 JavaScript engine. Node.js uses an event-driven, non-blocking I/O model that makes it lightweight and efficient. Node.js' package ecosystem, npm, is the largest ecosystem of open source libraries in the world.

More simply put, Node.js allows us to quickly and efficiently run JavaScript code outside the browser, making it possible to use the same language on both the frontend and the backend.

## Install the Node.js environment

Node.js will install on most major Operating systems. Mac OS X, Windows and many flavors of Linux are supported.

### Node.js on OS X

Simply download the [OS X installer](https://nodejs.org/en/download/) directly from the official Node.js website. We highly recommend this solution if you are not familiar with package managers.

If you want to install Node.js via [Homebrew](http://brew.sh/):

```bash
$ brew install node
```

If you want to install Node.js via [MacPorts](http://www.macports.org/):

```bash
$ port install nodejs
```

If you want to install Node.js via [pkgsrc](https://pkgsrc.joyent.com/install-on-osx/):

```bash
$ pkgin -y install nodejs
```

### Node.js on Windows

Simply download the [Windows installer](https://nodejs.org/en/download/) directly from the official Node.js website. We highly recommend this solution if you are not familiar with package managers.

If you want to install Node.js via [Chocolatey](http://chocolatey.org/):

```bash
$ cinst nodejs.install
```

If you want to install Node.js via [Scoop](http://scoop.sh/):

```bash
$ scoop install nodejs
```

## Verify the installation

Before continuing, we need verify that Node.js is correctly installed with the npm package manager.

Print the Node.js version installed on your machine:

```bash
$ node -v
v5.7.0
```

Print the npm version installed on your machine:

```bash
$ npm -v
3.6.0
```

You need to make sure your machine meets the following requirements:

- Node.js >= 4.0.0
- npm >= 3.0.0
