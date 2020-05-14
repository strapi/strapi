# Deployment

Strapi gives you many possible deployment options for your project or application. Strapi can be deployed on traditional hosting servers or services such as Heroku, AWS, Azure and others. The following documentation covers how to develop locally with Strapi and deploy Strapi with various hosting options.

::: tip
Deploying **databases** along with Strapi is covered in the [Databases Guide](../guides/databases.md).
:::

## Hosting Provider Guides

Manual guides for deployment on various platforms, for One-click and docker please see the [installation](./installation) guides.

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

<div>
	<InstallLink link="../deployment/azure">
    <template #icon>
    <svg width="100" height="77.43" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.68 15.24"><path d="M9.105 14.43l4.642-.82.043-.01-2.387-2.84a403.945 403.945 0 0 1-2.387-2.853c0-.014 2.465-6.802 2.479-6.826.004-.008 1.682 2.888 4.066 7.02l4.09 7.09.031.054-7.587-.001-7.587-.001 4.597-.812zM0 13.566c0-.004 1.125-1.957 2.5-4.34L5 4.893l2.913-2.445C9.515 1.104 10.83.002 10.836 0a.512.512 0 0 1-.047.118L7.625 6.903l-3.107 6.663-2.259.003c-1.242.002-2.259 0-2.259-.004z" fill="#fff"/></svg>
    </template>
		<template #title>Azure</template>
		<template #description>
			Step by step guide for deploying on Azure web app
		</template>
	</InstallLink>
</div>

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
	<InstallLink link="../deployment/google-app-engine">
		<template #icon>
			<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" version="1.1"><path d="M6.969 3L4.094 8.188l1.468 2.624L8.438 6h10.25L17 3zm8.75 4l2.969 4.906L13.625 21H17l5-9-2.781-5zM12 8c-2.207 0-4 1.793-4 4s1.793 4 4 4 4-1.793 4-4-1.793-4-4-4zM3.531 9.219L2 12l4.969 9H12.5l1.656-3h-5.75zM12 10c1.102 0 2 .898 2 2 0 1.102-.898 2-2 2-1.102 0-2-.898-2-2 0-1.102.898-2 2-2z" fill="#fff"/></svg>
		</template>
		<template #title>Google App Engine</template>
		<template #description>
			Manual step by step guide for deploying on GCP's App Engine
		</template>
	</InstallLink>
</div>

<div>
	<InstallLink link="../deployment/heroku">
    <template #icon>
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 5.12 5.12" preserveAspectRatio="xMinYMin meet"><path d="M3.068 4.415V2.382s.132-.487-1.63.2C1.436 2.6 1.436.7 1.436.7L2.01.697v1.2s1.61-.635 1.61.48v2.026h-.555zm.328-2.986h-.6c.22-.27.42-.73.42-.73h.63s-.108.3-.44.73zm-1.95 2.982V3.254l.58.58-.58.58z" fill="#fff"/></svg>
    </template>
		<template #title>Heroku</template>
		<template #description>
			Step by step guide for deploying on Heroku
		</template>
	</InstallLink>
</div>

## Optional Software Guides

Additional guides for optional software additions that compliment or improve the deployment process when using Strapi in a production or production-like environment.

<div>
	<InstallLink link="../deployment/caddy-proxy">
    <template #icon>
    <svg width="100%" height="100%" viewBox="0 0 103 103" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;fill:fff"><g transform="matrix(1,0,0,1,-469.827,-182.266)"><g id="Icon" transform="matrix(0.672861,0,0,0.672861,438.989,27.7667)"><circle cx="122.367" cy="306.152" r="73.563" style="fill:3498DB"/><clipPath id="_clip1"><circle cx="122.367" cy="306.152" r="73.563"/></clipPath><g clip-path="url(#_clip1)"><g transform="matrix(1.55283,0,0,1.55283,-66.5904,101.019)"><g transform="matrix(0.146503,0,0,0.15211,81.614,98.6353)"><path d="M85.551,183.291C85.551,128.882 102.812,88.234 135.453,61.494C166.928,35.708 212.88,22.79 270.112,23.514C328.331,24.245 374.014,37.487 405.1,63.019C437.585,89.699 454.581,130.12 454.581,185.182L454.385,299.127L465.87,287.662L393.91,287.662L405.395,299.147L405.395,214.64L405.37,214.262C405.253,212.503 405.182,210.523 405.084,206.73C404.776,194.814 404.565,190.027 403.813,182.495C402.737,171.714 400.852,161.708 397.84,152.132C391.076,130.625 379.053,112.815 360.448,99.724C338.827,84.512 309.329,76.514 271.083,76.514C232.573,76.514 202.721,84.545 180.754,99.789C161.792,112.947 149.442,130.896 142.568,152.426C139.23,162.883 137.286,173.837 136.402,185.436C135.768,193.755 135.712,200.667 135.953,211.011C135.957,211.188 136.001,213.041 136.013,213.552C136.033,214.451 136.047,215.151 136.058,215.785L136.056,215.6L136.056,299.147L147.541,287.662L74.066,287.662L85.551,299.147L85.551,183.291ZM62.581,183.291L62.581,310.632L159.026,310.632L159.026,215.6L159.025,215.414C159.013,214.721 158.998,213.974 158.977,213.029C158.965,212.506 158.921,210.643 158.917,210.476C158.692,200.834 158.743,194.564 159.306,187.182C160.062,177.255 161.699,168.028 164.45,159.412C169.858,142.472 179.291,128.762 193.849,118.66C211.673,106.291 236.977,99.484 271.083,99.484C304.881,99.484 329.785,106.236 347.23,118.51C361.438,128.508 370.598,142.076 375.928,159.023C378.426,166.966 380.026,175.461 380.956,184.777C381.633,191.558 381.828,195.975 382.122,207.324C382.228,211.423 382.307,213.611 382.45,215.778L382.425,215.02L382.425,310.632L477.335,310.632L477.355,299.167L477.551,185.201C477.551,123.576 457.784,76.564 419.679,45.268C384.065,16.018 333.419,1.337 270.402,0.546C140.797,-1.094 62.581,62.983 62.581,183.291Z" style="fill-rule:nonzero;"/></g><g transform="matrix(0.224865,0,0,0.22949,50.577,55.9129)"><path d="M492.019,420.805C492.019,392.917 468.912,370.275 440.45,370.275L184.447,370.275C155.985,370.275 132.878,392.917 132.878,420.805L132.878,572.108C132.878,599.996 155.985,622.637 184.447,622.637L440.45,622.637C468.912,622.637 492.019,599.996 492.019,572.108L492.019,420.805Z"/></g></g></g></g></g></svg>
    </template>
		<template #title>Caddy</template>
		<template #description>
			Overview of proxying Strapi with Caddy
		</template>
	</InstallLink>
</div>

<div>
	<InstallLink link="../deployment/nginx-proxy">
    <template #icon>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-35.5 26 32 32" width="64" height="64"><path d="M-33.442 42.023v-7.637a.68.68 0 0 1 .385-.651l13.173-7.608c.237-.148.503-.178.74-.03l13.232 7.637a.71.71 0 0 1 .355.651V49.63a.71.71 0 0 1-.355.651l-11.367 6.57a56.27 56.27 0 0 1-1.806 1.036c-.266.148-.533.148-.8 0l-13.202-7.608c-.237-.148-.355-.326-.355-.622v-7.637z" fill="#fff"/><path d="M-24.118 39.18v8.9c0 1.006-.8 1.894-1.865 1.865-.65-.03-1.154-.296-1.5-.858-.178-.266-.237-.562-.237-.888V35.836c0-.83.503-1.42 1.154-1.687s1.302-.207 1.954 0c.622.178 1.095.562 1.5 1.036l7.874 9.443c.03.03.06.09.118.148v-9c0-.947.65-1.687 1.57-1.776 1.154-.148 1.924.68 2.042 1.54v12.6c0 .7-.326 1.214-.918 1.54-.444.237-.918.296-1.42.266a3.23 3.23 0 0 1-1.954-.829c-.296-.266-.503-.592-.77-.888l-7.49-8.97c0-.03-.03-.06-.06-.09z" fill="#3498DB"/></svg>
    </template>
		<template #title>Nginx</template>
		<template #description>
			Overview of proxying Strapi with Nginx
		</template>
	</InstallLink>
</div>

## Application Configuration

### 1. Configure

We always recommend you use environment variables to configure your application based on the environment. Here is an example:

**Path —** `./config/server.js`.

```js
module.exports = ({ env }) => ({
  host: env('APP_HOST', '0.0.0.0'),
  port: env.int('NODE_PORT', 1337),
});
```

Then you can create a `.env` file or directly use the deployment platform you use to set environment variables:

**Path —** `.env`.

```
APP_HOST=10.0.0.1
NODE_PORT=1338
```

::: tip
To learn more about configuration you can read the documentation [here](../concepts/configurations.md)
:::

### 2. Launch the server

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
