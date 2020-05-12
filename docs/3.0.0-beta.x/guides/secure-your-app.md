# Secure your application

In this guide we will see how you can secure your Strapi application by using a third party provider.

::: tip
In this example we will use [Sqreen](https://sqreen.com).
:::

Their [onboarding](https://my.sqreen.com/new-application#nodejs-agent) is really easy to follow and understand.

## Install Sqreen

Sqreen is an Application Security Management tool that enables protection tailored to your stack, allowing unprecedented visibility into your security and ability to scale it in production.

You will have to install Sqreen node_module in your application.

:::: tabs

::: tab yarn
`yarn add sqreen`
:::

::: tab npm
`npm install sqreen`
:::

::::

## Start your application programmaticaly

We will have to require the Sqreen node_module in the file we use to start Strapi.

To do so you will have to create a `server.js` file to be able to start our application by running `node server.js`.

**Path —** `./server.js`

```js
const strapi = require('strapi');
strapi().start();
```

Now you can run `node server.js` and it will start your application.

## Inject and configure Sqreen agent

By following their Node.js onboarding, we need to require the Sqreen node_module where the server is started.
Also, Sqreen has to be required just before Strapi to work!

*This is the reason why we have created a `server.js` file.*

To do so, you will have to update this file.

**Path —** `./server.js`

```js
require('sqreen');
const strapi = require('strapi');
strapi().start();
```

To let Strapi and Sqreen sync, you will have to create a `./sqreen.json` file with your credentials.

Then start your server with `node server.js` and we are done.
