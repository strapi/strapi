# Migration guide from 3.0.0-beta.20 to 3.0.0

Upgrading your strapi application to `3.0.0`.

**Make sure your server is not running until the end of the migration**

## Upgrading your dependencies

Start by upgrading your dependencies. Make sure to use exact versions.

Update your package.json accordingly:

```json
{
  // ...
  "dependencies": {
    "strapi": "3.0.0",
    "strapi-admin": "3.0.0",
    "strapi-connector-bookshelf": "3.0.0",
    "strapi-plugin-content-manager": "3.0.0",
    "strapi-plugin-content-type-builder": "3.0.0",
    "strapi-plugin-email": "3.0.0",
    "strapi-plugin-graphql": "3.0.0",
    "strapi-plugin-upload": "3.0.0",
    "strapi-plugin-users-permissions": "3.0.0",
    "strapi-utils": "3.0.0"
  }
}
```

Then run either `yarn install` or `npm install`.

## New configuration loader

We have reworked the way a strapi project is configured to make it simpler yet more powerfull.

Some of the improvements are:

- `.env` support.
- Less files.
- Environment overwrites.

Before migrating, you should first read the new [configuration documentation](../concepts/configurations.md).

### Migrating

**Server**

Your server configuration can move from `./config/environments/{env}/server.json` to `./config/server.js` like shown [here](../concepts/configurations.md#server).

**Database configuration**

Your database configuration can move from `./config/environments/{env}/database.json` to `./config/database.js` like shown [here](../concepts/configurations.md#database).

**Middlewares**

We have moved all the middleware related configurations into one place: `./config/middleware.js`.

The middlewares were configured in mutliple files:

- `./config/middleware.json`
- `./config/application.json`
- `./config/language.json`
- `./config/environments/{env}/request.json`
- `./config/environments/{env}/response.json`
- `./config/environments/{env}/security.json`

First you can create a file `./config/middleware.js`.

```js
module.exports = {
  timeout: 100,
  load: {
    before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
    order: [
      "Define the middlewares' load order by putting their name in this array is the right order",
    ],
    after: ['parser', 'router'],
  },
  settings: {
    public: {
      path: './public',
      maxAge: 60000,
    },
  },
};
```

You can now move the middleware configurations from `application.json`, `language.json`, `security.json`, `request.json` and `response.json` files directly into the `settings` property.

You can review all possible options the [middleware documentation](../concepts/middlewares.md#configuration-and-activation).

::: tip
If you never configured any middlewares you can delete the file all together. You can also only set the configurations you want to customize and leave the others out.
:::

**Hook**

We applied the same logic from the `middleware` configuration to the `hook` configuration.

First you can create a file `./config/hook.js`, and you can move the content of `./config/.hook.json` into it.

::: tip
If you never configured any hook you can delete the file all together. You can also only set the configurations you want to customize and leave the others out.
:::

**Functions**

You can leave your functions as is, we didn't change how they work.

**Policies**

You can leave your policies as is, we didn't change how they work.

**Custom**

Any custom configuration you have can still be used. You can read the [configuration documentation](../concepts/configurations.md) to know more.

**Plugin**

From now on, you can set your plugin configurations in `./config/plugins.js` or `./config/env/{env}/plugin.js`.

**Example**

```js
module.exports = {
  graphql: {
    depthLimit: 5,
  },
};
```

## Database lifecycles

We have replaced the old lifecycles that add a lot of issues with a new simpler lifecycle layer.

You can read more [here](../concepts/models.md#lifecycle-hooks).

## Email plugin settings

Email plugin settings have been moved to files. Now you can configure your email provider directly in files.

You can read the documentation [here](../plugins/email.md#configure-the-plugin) to update.

## GraphQL changes

If you are using the graphql `register` mutation, the input and response types have changed. You can check the code [here](https://github.com/strapi/strapi/pull/6047).

## Remove `idAttribute` and `idAttributeType` options.

Currently using the idAttribute and idAttributeType options can break strapi in many ways. Fixing this is going to require a lot of work on the database and content management layer.

In an effort to make strapi more stable we have decided to remove those broken options for the time being. For users who want unique uuid fields for examples we recommend you create a uuid attribute and use the lifecycles function to populate it.

## Proxy configuration

In order to support hosting strapi with more flexibility, we have changed the way to configure the server proxy options and the admin panel path.

### Proxy

We replaced the `proxy` option found in `./config/server.json` by the `url` option.

This option also makes the `admin.build.backend` option obsolete.

This option tells strapi where it is hosted and is usefull for generating links or telling the admin panel where the API is available.

**Before**

**Path —** `./config/server.json`

```json
{
  "proxy": {
    "enabled": true,
    "ssl": true,
    "host": "domain.com",
    "port": "1337"
  }
}
```

**After**

**Path —** `./config/server.js`

```js
module.exports = {
  //...
  url: `https://domain.com:1337`,
};
```

What you can now do is add a path to the url to host strapi in a sub path of your domain.

```js
module.exports = {
  //...
  url: `https://domain.com:1337/my-strapi-api`,
};
```

::: warning
Adding a sub path to the url doesn't mean your api is going to be prefixed. You will need to host your app behind a proxy and remove the prefix so strapi receives request like if they where made on the root `/` path.
:::

You can see this option in action in the following [deployment guide](../deployment/nginx-proxy.md).

### Admin path

We replaced the `admin.path` option by the `admin.url` option to offer more flexibility of deployment.

The `url` option can either be a relative path: `/admin-panel` or an absolute url.

**Before**

**Path —** `./config/server.json`

```json
{
  "admin": {
    "path": "/dashboard"
  }
}
```

**After**

**Path —** `./config/server.js`

```js
module.exports = {
  //...
  admin: {
    url: '/dashboard',
  },
};
```

You can see this option in action in the following [deployment guide](../deployment/nginx-proxy.md).

## Rebuilding your administration panel

You can run `yarn build --clean` or `npm run build -- --clean` to rebuild your admin panel with the newly installed version of strapi.

Finally restart your server: `yarn develop` or `npm run develop`.
