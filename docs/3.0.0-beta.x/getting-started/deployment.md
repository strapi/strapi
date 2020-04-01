# Deployment

Strapi gives you many possible deployment options for your project or application. Strapi can be deployed on traditional hosting servers or services such as Heroku, AWS, Azure and others. The following documentation covers how to develop locally with Strapi and deploy Strapi with various hosting options.

::: tip
Deploying **databases** along with Strapi is covered in the [Databases Guide](../guides/databases.md).
:::

## Documented Options

Manual guides guides for deployment on various platforms, for One-click and docker please see the [installation](./installation) guides.

<div>
	<InstallLink link="../deployment/amazon-aws">
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
		<template #title>DigitalOcean</template>
		<template #description>
			Manual step by step guide for deploying on DigitalOcean droplets
		</template>
	</InstallLink>
</div>

<div>
	<InstallLink link="../deployment/heroku">
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
