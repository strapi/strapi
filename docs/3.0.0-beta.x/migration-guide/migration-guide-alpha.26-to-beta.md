# Migration Guide

Upgrading your Strapi application to `v3.0.0-beta.x`.

To upgrade a project to the `beta` version of Strapi follow the instructions below.

## Updating global Strapi installation

If you have previously installed Strapi globally. You will need to upgrade its version:

```bash
npm install -g strapi@beta
# or
yarn global add strapi@beta
```

## Updating dependencies

First let's clean your project's dependencies and update the `package.json` file.

### Clean your `node_modules`

```bash
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

Starting from this new release plugins are now npm dependencies so, you need to install them too.

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

We have completely refreshed the `scripts` of a project so update them as follows:

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

**Warning**

To avoid confusions we have decided to give the same behaviour to the `npm run start` and `strapi start` commands. To do so we had to introduce a new `strapi develop` command to run your project in `watch` mode.

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

If you really need a server.js file to be able to run `node server.js` instead of `npm run start` then create a `./server.js` file as follows:

```js
const strapi = require('strapi');

strapi(/* {...} */).start();
```

## Migrating `config`

You can leave all your files in `./config` unchanged and remove the `server.autoReload` key in `./config/environments/**/server.json`.

## Migrating `plugins`

One of our main objectives for the `beta` is to make it easier and quicker to upgrade to more recent versions of Strapi. This is why starting from now, plugins will be located in `node_modules`.

[link to the doc](link)

### Migrating non customized plugin

If you installed a plugin but never modified any file inside `./plugins/pluginName/**/*`, you can remove the `./plugins/pluginName` folder.

### Migrating customized plugin

If you have made some modifications in one of your plugins you will have to do some manual migrations.

The main principle is to keep only the files you modify and move them to the `./extensions/pluginName` folder.

Read the following instructions for more details.

#### Config

When customizing configurations you only need to move the modified files.

Strapi merges the plugin's configurations with the ones in `./extensions/pluginName/config`. Hence you should also only add the fields that you modified in your custom configurations files.

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

For example if you have a `customIndex` action in the `User` controller you only have to create the `./extensions/users-permissions/controllers/User.js` file and keep your `customIndex` action in it. You can delete the rest of the files and methods.

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

If you have modified (or cerated relations) with a plugin's model you will have to move your Model file to `./extensions/pluginName/models/Model.settings.json`

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

In the `beta` we are introducing the `Core API`, which is replacing the templates that were generated before.

Now when you create a new model your `controller` and `service` will be empty modules and will only be used to override the default behaviours. [link to the doc](link)

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

If you haven't customized the `destroy` action then just remove it from your controller instead of renaming it.

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

Customizing the admin is as simple as creating a file in the `./admin` folder of your app. You need to make sure the file you want to customize is at the same location in your `./admin` folder as it is in the `strapi-admin` package. For a reference you can look at the [source code](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin).

For the beta there are quite a lot of changes that were made to the admin. If you did customize things you will have to verifiy if the file still exists in the [source code](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin) or find its new location.

### Example

You can modify the logo of the app by creating a file `./admin/src/assets/images/logo-strapi.png` to replace the admin logo.

You can do the same with any file in the [source code](https://github.com/strapi/strapi/tree/master/packages/strapi-admin/admin) of the admin panel

## Migrating your database

Starting from `beta` we are adding a new model `Administrator` to replace the `users-permissions` plugin `User` model for connecting to the `Strapi admin panel` panel.

The goal is to emphasize the difference between an `Administrator` of the `Strapi admin panel` and a `User` of the application you are building with Strapi. Thus making the `users-permissions` plugin focused on providing an authentication and authorization service to your application.

This means that, from now on you will have a new `strapi_administrator` collection in your database. Since this new table will be empty on startup, you will be asked to create a new administrator.

You can either create this new administrator and manually recreate all your administrators or, create a migration script that will copy your `users` with `administrator` role to the `strapi_administrator` collection.

In the short term the `Administrator` model will not be customisable. If you need have created relations between your models and the `User` model (e.g: author) to link to the administrator you will have to keep these users in both collections.

## Running your migrated project

To run your migrated project you will now need to run `strapi develop` or `npm run develop` to run the project in watch mode (e.g auto reloading on content-type creation).

To run strapi without watch mode then run `strapi start` or `npm run start`

Finally if you want to run your project in different envrionments use `NODE_ENV=env npm run start`

## Updating Deployments

When deploying a Strapi project you will have to make sure the `build` script is ran. (e.g `npm run build`)

Depending on your deployment environment you might have to run the `build` script with `NODE_ENV=production npm run build` if the envrionment doesn't include it by default.

For example `heroku` will automatically run the `build` script for you and set `NODE_ENV=production` before running the scripts so you won't have to think about it.

## Conclusion
