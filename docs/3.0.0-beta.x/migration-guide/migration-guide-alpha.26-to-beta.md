# Migration Guide

Upgrading your Strapi application to `v3.0.0-beta.x`.

To upgrade a project to the `beta` version of Strapi follow the instructions below.

## Updating global Strapi installation

If you have installed Strapi globally. You will need to upgrade its version:

```bash
npm install -g strapi@beta
# or
yarn global add strapi@beta
```

## Updating dependencies

First, let's clean your project's dependencies and update its `package.json` file.

### Clean your `node_modules`

Start by deleting the `package-lock.json` or `yarn.lock` file. Then remove all your current `node_modules`:

```bash
rm package-lock.json # OR rm yarn.lock
rm -rf node_modules
```

### Update your `package.json`

Start by upgrading all your strapi dependencies to the current `beta`.

To find the current `beta` version to use in `package.json` run:

```bash
npm view strapi@beta version
# 3.0.0-beta.x
```

#### `Dependencies`

You must upgrade the versions and add `strapi-admin` as a dependency.

**Before**

```json
{
  "dependencies": {
    //...
    "strapi": "3.0.0-alpha.26.2",
    "strapi-hook-bookshelf": "3.0.0-alpha.26.2",
    "strapi-hook-knex": "3.0.0-alpha.26.2",
    "strapi-utils": "3.0.0-alpha.26.2"
  }
}
```

**After**

```json
{
  "dependencies": {
    //...
    "strapi": "3.0.0-beta.x",
    "strapi-admin": "3.0.0-beta.x",
    "strapi-hook-bookshelf": "3.0.0-beta.x",
    "strapi-hook-knex": "3.0.0-beta.x",
    "strapi-utils": "3.0.0-beta.x"
  }
}
```

Starting from this new release, plugins are now npm dependencies so, you need to install them as well.

Here are the default ones. If you have installed other plugins you will also need to add them here (e.g `strapi-plugin-graphql`).

```json
{
  "dependencies": {
    //...
    "strapi-plugin-content-manager": "3.0.0-beta.x",
    "strapi-plugin-content-type-builder": "3.0.0-beta.x",
    "strapi-plugin-email": "3.0.0-beta.x",
    "strapi-plugin-settings-manager": "3.0.0-beta.x",
    "strapi-plugin-upload": "3.0.0-beta.x",
    "strapi-plugin-users-permissions": "3.0.0-beta.x"
  }
}
```

#### `Scripts`

We have completely refreshed the `scripts` of a project, so update them as follows:

**Before**

```json
{
  "scripts": {
    "setup": "cd admin && npm run setup",
    "start": "node server.js",
    "strapi": "node_modules/strapi/bin/strapi.js",
    "postinstall": "node node_modules/strapi/lib/utils/post-install.js"
    //...
  }
}
```

**After**

```json
{
  "scripts": {
    "develop": "strapi develop",
    "start": "strapi start",
    "build": "strapi build",
    "strapi": "strapi"
    //...
  }
}
```

::: warning

To avoid confusions we have decided to give the same behavior to the `npm run start` and `strapi start` commands. To do so we had to introduce a new `strapi develop` command to run your project in `watch` mode.

:::

#### `Strapi`

We removed the need for the `packageManager` key under `strapi`.

**Before**

```json
{
  "strapi": {
    //...
    "packageManager": "yarn"
  }
}
```

**After**

```json
{
  "strapi": {
    //...
  }
}
```

### Installing your new dependencies

You can now run

```bash
npm install
# or
yarn
```

## Migrating `server.js`

As of now, strapi can start without a `server.js` file. You can now delete it.

If you need a server.js file to be able to run `node server.js` instead of `npm run start` then create a `./server.js` file as follows:

```js
const strapi = require('strapi');

strapi(/* {...} */).start();
```

## Migrating `.gitignore`

You need to add a new section to the `.gitignore` file.

```text
############################
# Strapi
############################

exports
.cache
build
```

## Migrating `config`

You can leave all your files in `./config` unchanged but remove the `server.autoReload` key in `./config/environments/**/server.json`.

## Migrating `plugins`

One of our main objectives for the `beta` is to make it easier and quicker to upgrade to more recent versions of Strapi. This is why moving forward, plugins will be located in the `node_modules` folder.

[Read more](https://strapi.io/documentation/3.0.0-beta.x/concepts/concepts.html#files-structure)

Let's start by creating a new folder called `./extensions`. This folder needs to exist even if it's empty. You may use a `.gitkeep` file to ensure the folder isn't deleted from the repository (if it's empty) when cloning. [More details](https://davidwalsh.name/git-empty-directory).

### Migrating non customized plugin

If you installed a plugin but never modified any files inside `./plugins/pluginName/**/*`, you can remove the `./plugins/pluginName` folder. You may also remove the default installed plugins. This may mean that there are no plugins inside the `./plugins` folder, so you can delete the `./plugins` folder.

**Note:** If you have created a **custom plugin** leave the plugin in the `./plugins` folder. Newly created **custom plugins** are placed in the `./plugins` folder.

### Migrating customized plugin

If you have made some modifications to one of your plugins, you will have to do some manual migrations:

The main principle is to keep only the files you modified and move them to the `./extensions/pluginName` folder.

Read the following instructions for more details.

#### Config

When customizing configurations you only need to move the modified files.

Strapi merges the plugin's configurations with the ones in `./extensions/pluginName/config`. Therefore, you should also only add the fields that you modified in your custom configurations files.

**Before**

`./plugins/graphql/config/settings.json`

```json
{
  "endpoint": "/graphql", // default
  "tracing": false, // default
  "shadowCRUD": true, // default
  "playgroundAlways": false, // default
  "depthLimit": 2,
  "amountLimit": 25
}
```

**After**

`./extensions/graphql/config/settings.json`

```json
{
  "depthLimit": 2,
  "amountLimit": 25
}
```

#### Routes

If you modified `./plugins/pluginName/config/routes.json` you will have to copy the file to `./extentions/pluginName/config/routes.json` and only keep the routes you customized or added.

All the unchanged routes must be removed from this file.

**Before**

`./plugins/users-permissions/config/routes.json`

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "UsersPermissions.customIndex",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/init",
      "handler": "UsersPermissions.init",
      "config": {
        "policies": [],
        "description": "Check if the first admin user has already been registered",
        "tag": {
          "plugin": "users-permissions",
          "name": "Role"
        }
      }
    }
    //...
  ]
}
```

**After**

`./extensions/users-permissions/config/routes.json`

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "UsersPermissions.customIndex",
      "config": {
        "policies": []
      }
    }
  ]
}
```

#### Controllers & Services

To migrate controllers and services you must move your customized controllers and services to the `./extensions/pluginName/**/*`, delete all the non customized ones and keep only the methods you modified in your customized files·

For example, if you have a `customIndex` action in the `User` controller you only have to create the `./extensions/users-permissions/controllers/User.js` file and keep your `customIndex` action in it. You can delete the rest of the files and methods.

**Before**

`./plugins/users-permissions/controllers/User.js`

```javascript
module.exports = {
  customIndex: async ctx => {},

  find: async (ctx, next, { populate } = {}) => {
    //...
  },

  me: async ctx => {
    //...
  },

  //...
};
```

**After**

`./extensions/users-permissions/controllers/User.js`

```js
module.exports = {
  customIndex: async ctx => {},
};
```

> The same goes for services

#### Models

If you have modified (or created relations) with a plugin's model, you will have to move your Model file to `./extensions/pluginName/models/Model.settings.json`

Here you need to keep the entire model. It will replace the one in the plugin rather than being merged with it.

**Before**

`./plugins/users-permissions/models/User.settings.json`

```json
{
  "connection": "default",
  "collectionName": "users-permissions_user",
  "info": {
    "name": "user",
    "description": ""
  },
  "attributes": {
    "username": {
      "type": "string",
      "minLength": 3,
      "unique": true,
      "configurable": false,
      "required": true
    },
    "email": {
      "type": "email",
      "minLength": 6,
      "configurable": false,
      "required": true
    },
    "provider": {
      "type": "string",
      "configurable": false
    },
    "password": {
      "type": "password",
      "minLength": 6,
      "configurable": false,
      "private": true
    },
    "resetPasswordToken": {
      "type": "string",
      "configurable": false,
      "private": true
    },
    "confirmed": {
      "type": "boolean",
      "default": false,
      "configurable": false
    },
    "blocked": {
      "type": "boolean",
      "default": false,
      "configurable": false
    },
    "role": {
      "model": "role",
      "via": "users",
      "plugin": "users-permissions",
      "configurable": false
    },
    "products": {
      "collection": "product",
      "via": "owner"
    }
  }
}
```

**After**

`./extensions/users-permissions/models/User.settings.json`

```json
{
  "connection": "default",
  "collectionName": "users-permissions_user",
  "info": {
    "name": "user",
    "description": ""
  },
  "attributes": {
    "username": {
      "type": "string",
      "minLength": 3,
      "unique": true,
      "configurable": false,
      "required": true
    },
    "email": {
      "type": "email",
      "minLength": 6,
      "configurable": false,
      "required": true
    },
    "provider": {
      "type": "string",
      "configurable": false
    },
    "password": {
      "type": "password",
      "minLength": 6,
      "configurable": false,
      "private": true
    },
    "resetPasswordToken": {
      "type": "string",
      "configurable": false,
      "private": true
    },
    "confirmed": {
      "type": "boolean",
      "default": false,
      "configurable": false
    },
    "blocked": {
      "type": "boolean",
      "default": false,
      "configurable": false
    },
    "role": {
      "model": "role",
      "via": "users",
      "plugin": "users-permissions",
      "configurable": false
    },
    "products": {
      "collection": "product",
      "via": "owner"
    }
  }
}
```

#### Admin

For now you won't be able to customize a plugin's admin. This feature will come soon so keep an eye out for this feature.

### Migrating local plugins

If you have local plugins (plugins in the `./plugins` that don't exist on npm) you can leave them in the plugins folder.

The only difference is that the admin of a local plugin is ignored for the moment.

## Migrating `api`

### Migrating controllers and services

In the `beta`, we are introducing the `Core API`, which is replacing the templates that were generated before.

Now when you create a new model your `controller` and `service` will be empty modules and will be used to override the default behaviors.
Read more about [controllers](https://strapi.io/documentation/3.0.0-beta.x/guides/controllers.html) or [services](https://strapi.io/documentation/3.0.0-beta.x/guides/services.html)

To migrate, you will only have to delete the methods you haven't modified or created from your `controllers` and `services`

**Before**

`./api/product/controllers/Product.js`

```js
module.exports = {
  find: async (ctx) => {
	  myCustomImplementation(ctx);
  },

  customAction: async(ctx) => {
    ctx.send({ ok: true });
  }

  findOne: async (ctx) => {
    return strapi.services.product.fetch(ctx.params);
  },

  count: async (ctx) => {
    return strapi.services.product.count(ctx.query);
  },

  create: async (ctx) => {
    return strapi.services.product.add(ctx.request.body);
  },

  update: async (ctx) => {
    return strapi.services.product.edit(ctx.params, ctx.request.body) ;
  },

  destroy: async (ctx) => {
    return strapi.services.product.remove(ctx.params);
  }
};

```

**After**

`./api/product/controllers/Product.js`

```js
module.exports = {
  // this function overrides the default one
  find: async ctx => {
    myCustomImplementation(ctx);
  },

  // this one is added to the default controller
  customAction: async ctx => {
    ctx.send({ ok: true });
  },
};
```

> The same goes for services

For custom `controllers` and `services` (the ones without a model) you can leave them untouched.

### Migrating routes

In the file `./api/apiName/config/routes.json` we renamed the `destroy` action to `delete` you will have to update your `routes` and `controller` accordingly.

If you haven't customized the `destroy` action, then remove it from your controller rather than renaming it.

**Before**

`./api/product/config/routes.json`

```json
{
  "routes": [
    //...
    {
      "method": "DELETE",
      "path": "/products/:id",
      "handler": "Product.destroy",
      "config": {
        "policies": []
      }
    }
  ]
}
```

`./api/product/controllers/Product.js`

```js
module.exports = {
  find: async ctx => {
    return strapi.services.product.fetchAll(ctx.query);
  },

  findOne: async ctx => {
    return strapi.services.product.fetch(ctx.params);
  },

  count: async ctx => {
    return strapi.services.product.count(ctx.query);
  },

  create: async ctx => {
    return strapi.services.product.add(ctx.request.body);
  },

  update: async ctx => {
    return strapi.services.product.edit(ctx.params, ctx.request.body);
  },

  destroy: async ctx => {
    customImplementation(ctx);
  },
};
```

**After**

`./api/product/config/routes.json`

```json
{
  "routes": [
    //...
    {
      "method": "DELETE",
      "path": "/products/:id",
      "handler": "Product.delete",
      "config": {
        "policies": []
      }
    }
  ]
}
```

`./api/product/controllers/Product.js`

```js
module.exports = {
  delete: async ctx => {
    customImplementation(ctx);
  },
};
```

## Migrating `admin`

Numerous changes have been made to the admin with the release of beta:

- If you have not customized anything in `./admin` folder, then simply delete the `./admin` folder and it's contents.
- If you have customized any part of the `./admin` folder, then keep only those modified files, locate their new location in the directory structure ([source code](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin)), and then move the files to their new locations.

Customizing the admin is as simple as creating a file in the `./admin` folder of your app. You need to make sure the file you want to customize is at the same location in your `./admin` folder as it is in the `strapi-admin` package. For a reference you can look at the [source code](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin).

### Example

You can modify the logo of the app by creating a file `./admin/src/assets/images/logo-strapi.png` to replace the admin logo.

You can do the same with any file found in the [source code](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin) of the admin panel

## Running your migrated project

To run your migrated project you will now need to run `strapi develop` or `npm run develop` to run the project in watch mode (e.g auto reloading on content-type creation).

If you haven't run `strapi develop` or `npm run develop` (as above) and would like to run strapi without watch mode then you need to first run `strapi build` or `npm run build` as a first step, and then run `strapi start` or `npm run start`.

Finally, if you want to run your project in different environments use `NODE_ENV=env npm run start`, eg. `NODE_ENV=production npm run start` or `NODE_ENV=development npm run start`.

## Migrating your database

The beta introduces a new `Administrator` model created solely to allow user access to the Strapi administration panel (at this time this model is not editable). In this way, the `Administrator` model replaces the previous `User` model from the `users-permissions` plugin.

With this new model, you now have a clear distinction between the people that are allowed to access the administration panel, and the users of the application you built with Strapi.

More practically, it means that a new `strapi_administrator` collection will be created automatically in your database.
On startup, the `strapi_administrator` table is empty, therefore when migrating from alpha to beta, you may either create a new administrator user with the registration page OR you may manually migrate your previous users with `administrator` role.

### Cleaning up the `users-permissions.users` collection

If you only used the `administrator` role to give access to the admin panel to certain users, and never used this role for your application business logic, you can delete the role from within the admin panel.

If you haven't created any relation with the `User` model in your `Content Types` and don't use those users in your application business logic; you can remove every user you have migrated to the `strapi_administrator` collection.

Finally, if you have chosen to migrate your previous admin users in the new `strapi_administrator` collection but your `User` model has at least one relation with another model, then you may need to keep both the `strapi_administrator` and `users-pemrissions_user` collection manually in sync.

**Example**: Some of your application users can edit their profile and access the admin panel. If they change their email you need to make sure their `administrator` entity also changes email.
::: warning
We really recommend separating you users from your administrators to avoid this situation which is not a good practice.
:::

## Updating Deployments

### Building your admin panel

If you are deploying your Strapi project with the Admin panel together, you will have to make sure the `build` script runs before running the project. (e.g `npm run build`)

Depending on your deployment environment you might have to run the `build` script with `NODE_ENV=production npm run build` if the envrionment doesn't include it by default.

For example, `Heroku` will run the build script for you and set `NODE_ENV=production` before running the scripts so you won't have to think about it.

### Running the project

Previously, you could run your project by running `node server.js`. The beta version removes the `server.js` file, and so you will have to either run `npm run start` or manually create a `server.js` file (read more [here](#migrating-server.js))

#### PM2

if you are using pm2 to run your application in production you can update your script like so

**Before**

```bash
NODE_ENV=production pm2 start server.js
```

**After**

```bash
NODE_ENV=production pm2 start npm -- start
```

If you are using an `ecosystem.config.js` you can do the following:

**Before**

```js
module.exports = {
  apps: [
    {
      name: 'your-app-name',
      script: './path-to/your-strapi-app/server.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

**After**

```js
module.exports = {
  apps: [
    {
      name: 'your-app-name',
      cwd: './path-to/your-strapi-app',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

## Conclusion

The beta release of Strapi marks an important milestone in the long-term development of the project. Going forward the Strapi Community, their users and clients can continue to use and deploy Strapi with even greater confidence. Thank you for all the contributions that made this beta release possible.
