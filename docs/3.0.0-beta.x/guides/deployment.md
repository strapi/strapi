# Deployment

Strapi gives you many possible deployment options for your project or application. Strapi can be deployed on traditional hosting servers or services such as Heroku, AWS, Azure and others. The following documentation covers how to develop locally with Strapi and deploy Strapi with various hosting options.

(Deploying **databases** along with Strapi is covered in the [Databases Guide](/3.0.0-beta.x/guides/databases.html).)

**Table of contents:**

- [Configuration](#configuration)
- [Amazon Web Services](#amazon-web-services)
- [Digital Ocean](#digital-ocean)
- [Heroku](#heroku)
- [Docker](#docker)

---

## Configuration

#### #1 - Configure

Update the `production` settings with the IP and domain name where the project will be running.

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "domain.io", // IP or domain
  "port": 1337
}
```

In case your database is not running on the same server, make sure that the environment of your production
database (`./config/environments/production/database.json`) is set properly.

If you are passing a number of configuration item values via environment variables which is always encouraged for production environment, read the section for [Dynamic Configuration](../configurations/configurations.md#dynamic-configurations). Here is an example:

**Path —** `./config/environments/production/server.json`.

```js
{
  "host": "${process.env.APP_HOST || '127.0.0.1'}"
  "port": "${process.env.NODE_PORT || 1337}",
}
```

#### #3 - Launch the server

Before running your server in production you need to build your admin panel for production

```bash
NODE_ENV=production npm run build
```

Run the server with the `production` settings.

```bash
NODE_ENV=production npm run start
```

::: warning
We highly recommend using [pm2](https://github.com/Unitech/pm2/) to manage your process.
:::

### Advanced configurations

If you want to host the administration on another server than the API, [please take a look at this dedicated section](../advanced/customize-admin.md#deployment).

## Amazon Web Services

To see the documentation go [there](./deployment/aws.md)

## Digital Ocean

To see the documentation go [there](./deployment/digital-ocean.md)

## Heroku

To see the documentation go [there](./deployment/heroku.md)


## Docker

::: tip
You can also deploy using [Docker](https://hub.docker.com/r/strapi/strapi)
:::

The method below describes regular deployment using the built-in mechanisms.
