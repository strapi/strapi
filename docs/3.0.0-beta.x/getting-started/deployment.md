# Deployment

Strapi gives you many possible deployment options for your project or application. Strapi can be deployed on traditional hosting servers or services such as Heroku, AWS, Azure and others. The following documentation covers how to develop locally with Strapi and deploy Strapi with various hosting options.

::: tip
Deploying **databases** along with Strapi is covered in the [Databases Guide](../guides/databases.md).
:::

## Documented Options

Manual guides guides for deployment on various platforms, for One-click and docker please see the [installation](./installation) guides.

<div>
	<InstallLink link="../deployment/amazon-aws">
    <template #icon>
    <svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><g fill="#fff" fill-rule="evenodd"><path d="M15.63 31.388l-7.135-2.56V18.373l7.135 2.43zm1.3 0l7.135-2.56V18.373l-7.135 2.432zm-7.7-13.8l7.2-2.033 6.696 2.16-6.696 2.273zm-2.092-.8L0 14.22V3.75l7.135 2.43zm1.307 0l7.135-2.56V3.75L8.443 6.192zm-7.7-13.8l7.2-2.043 6.696 2.16-6.696 2.273zm23.052 13.8l-7.135-2.56V3.75l7.135 2.43zm1.3 0l7.135-2.56V3.75l-7.135 2.43zm-7.7-13.8l7.2-2.033 6.696 2.16-6.696 2.273z" fill-rule="nonzero"></path></g></svg>
    </template>
		<template #title>Amazon AWS</template>
		<template #description>
			Step by step guide for deploying on AWS EC2
		</template>
	</InstallLink>
</div>

<!-- <div>
	<InstallLink link="../deployment/azure">
		<template #title>Azure</template>
		<template #description>
			Step by step guide for deploying on Azure web app
		</template>
	</InstallLink>
</div> -->

<div>
	<InstallLink link="../deployment/digitalocean">
		<template #icon>
			<svg width="178" height="177" viewBox="0 0 178 177" xmlns="http://www.w3.org/2000/svg"><g fill="#fff" fill-rule="evenodd"><path d="M89 176.5v-34.2c36.2 0 64.3-35.9 50.4-74-5.1-14-16.4-25.3-30.5-30.4-38.1-13.8-74 14.2-74 50.4H.8C.8 30.6 56.6-14.4 117.1 4.5c26.4 8.3 47.5 29.3 55.7 55.7 18.9 60.5-26.1 116.3-83.8 116.3z" fill-rule="nonzero"></path><path d="M89.1 142.5H55v-34.1h34.1zM55 168.6H28.9v-26.1H55zM28.9 142.5H7v-21.9h21.9v21.9z"></path></g></svg>
		</template>
		<template #title>DigitalOcean</template>
		<template #description>
			Manual step by step guide for deploying on DigitalOcean droplets
		</template>
	</InstallLink>
</div>

<div>
	<InstallLink link="../deployment/heroku">
    <template #icon>
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 5.12 5.12" preserveAspectRatio="xMinYMin meet"><path d="M4.12 5.12H.968a.49.49 0 0 1-.488-.488V.488A.49.49 0 0 1 .968 0H4.12a.49.49 0 0 1 .488.488v4.144a.49.49 0 0 1-.488.488z" fill="#fff"/><path d="M3.068 4.415V2.382s.132-.487-1.63.2C1.436 2.6 1.436.7 1.436.7L2.01.697v1.2s1.61-.635 1.61.48v2.026h-.555zm.328-2.986h-.6c.22-.27.42-.73.42-.73h.63s-.108.3-.44.73zm-1.95 2.982V3.254l.58.58-.58.58z" fill="#3498DB"/></svg>
    </template>
		<template #title>Heroku</template>
		<template #description>
			Step by step guide for deploying on Heroku
		</template>
	</InstallLink>
</div>

## Configuration

#### 1. Configure

Update the `production` settings with the IP where the project will be running.

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "0.0.0.0", // IP or localhost
  "port": 1337
}
```

In case your database is not running on the same server, make sure that the environment of your production
database (`./config/environments/production/database.json`) is set properly.

If you are passing a number of configuration item values via environment variables, which is always encouraged for production environment, read the section for [Dynamic Configuration](../concepts/configurations.md#dynamic-configurations). Here is an example:

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "${process.env.APP_HOST || '127.0.0.1'}",
  "port": "${process.env.NODE_PORT || 1337}"
}
```

#### 2. Launch the server

Before running your server in production you need to build your admin panel for production

:::: tabs

::: tab yarn

```bash
NODE_ENV=production yarn build
```

:::

::: tab npm

```bash
NODE_ENV=production npm run build
```

:::

::: tab Windows

```bash
npm install cross-env
```

Then in your `package.json` scripts section:

```bash
"production": "cross-env NODE_ENV=production npm run build"
```

:::

::::

Run the server with the `production` settings.

:::: tabs

::: tab yarn

```bash
NODE_ENV=production yarn start
```

:::

::: tab npm

```bash
NODE_ENV=production npm start
```

:::

::: tab Windows

```bash
npm install cross-env
```

Then in your `package.json` scripts section:

```bash
"production": "cross-env NODE_ENV=production npm start"
```

:::

::::

::: warning
We highly recommend using [pm2](https://github.com/Unitech/pm2/) to manage your process.
:::

If you need a server.js file to be able to run `node server.js` instead of `npm run start` then create a `./server.js` file as follows:

```js
const strapi = require('strapi');

strapi(/* {...} */).start();
```

### Advanced configurations

If you want to host the administration on another server than the API, [please take a look at this dedicated section](../admin-panel/deploy.md).
