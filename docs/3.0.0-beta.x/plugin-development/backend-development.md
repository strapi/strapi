# Back-end Development

This section explains how the 'back-end part' of your plugin works.

## Routes

The plugin API routes are defined in the `./plugins/**/config/routes.json` file.

::: note
Please refer to [router documentation](../guides/routing.md) for informations.
:::

**Route prefix**

Each route of a plugin is prefixed by the name of the plugin (eg: `/my-plugin/my-plugin-route`).

To disable the prefix, add the `prefix` attribute to each concerned route, like below:

```json
{
  "method": "GET",
  "path": "/my-plugin-route",
  "handler": "MyPlugin.action",
  "prefix": false
}
```

## CLI

The CLI can be used to generate files in the plugins folders.

Please refer to the [CLI documentation](../cli/CLI.md) for more informations.

## Controllers

Controllers contain functions executed according to the requested route.

Please refer to the [Controllers documentation](../guides/controllers.md) for more informations.

## Models

A plugin can have its own models.

### Table/Collection naming

Sometimes it happens that the plugins inject models that have the same name as yours. Let's take a quick example.

You already have `User` model defining in your `./api/user/models/User.settings.json` API. And you decide to install the `Users & Permissions` plugin. This plugin also contains a `User` model. To avoid the conflicts, the plugins' models are not globally exposed which means you cannot access to the plugin's model like this:

```js
module.exports = {
  findUser: async function(params) {
    // This `User` global variable will always make a reference the User model defining in your `./api/xxx/models/User.settings.json`.
    return await User.find();
  },
};
```

Also, the table/collection name won't be `users` because you already have a `User` model. That's why, the framework will automatically prefix the table/collection name for this model with the name of the plugin. Which means in our example, the table/collection name of the `User` model of our plugin `Users & Permissions` will be `users-permissions_users`. If you want to force the table/collection name of the plugin's model, you can add the `collectionName` attribute in your model.

Please refer to the [Models documentation](../guides/models.md) for more informations.

## Policies

### Global policies

A plugin can also use a globally exposed policy in the current Strapi project.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "MyPlugin.index",
      "config": {
        "policies": ["global.isAuthenticated"]
      }
    }
  ]
}
```

### Plugin policies

A plugin can have its own policies, such as adding security rules. For instance, if the plugin includes a policy named `isAuthenticated`, the syntax to use this policy would be:

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "MyPlugin.index",
      "config": {
        "policies": ["plugins.myPlugin.isAuthenticated"]
      }
    }
  ]
}
```

Please refer to the [Policies documentation](../guides/policies.md) for more informations.

## ORM queries

Strapi supports multiple ORMs in order to let the users choose the database management system that suits their needs. Hence, each plugin must be compatible with at least one ORM. Each plugin contains a folder named `queries` in `./plugins/**/api/queries`. A file must be created for each ORM (eg. `mongoose.js` which exports the Mongoose ORM related queries).

The queries of a plugin are accessible through the `strapi.plugins.['pluginName'].queries('modelName', 'pluginName')` method, which automatically contains the queries according to the ORM used by the model.

### Example

Mongoose ORM queries definition:

**Path —** `./plugins/my-plugin/api/config/queries/mongoose.js`.

```js
module.exports = () => {
  return {
    getUsers: async params => {
      return User.find(params);
    },
  };
};
```

Bookshelf ORM queries definition:

**Path —** `./plugins/my-plugin/api/config/queries/bookshelf.js`.

```js
module.exports = () => {
  return {
    getUsers: async params => {
      return User.fetchAll(params);
    },
  };
};
```

Usage from the plugin:

**Path —** `./plugins/my-plugin/api/controllers/index.js`.

```js
module.exports = {
  getUsers: async () => {
    // Get parameters from the request
    const { limit, sort } = ctx.request.query;

    // Get the list of users using the plugins queries
    const users = await strapi.plugins['my-plugin']
      .queries('User', 'my-plugin')
      .getUsers({ limit, sort });

    // Send the list of users as response
    ctx.body = users;
  },
};
```

### Advanced usage

Strapi injects the model in the queries when instantiating them. It means you can create reusable queries very easily.
We use it for example in the [Content Manager plugin](https://github.com/strapi/strapi/tree/master/packages/strapi-plugin-content-manager/config/queries).

#### Example

Mongoose ORM generic queries:

**Path —** `./plugins/my-plugin/api/config/queries/mongoose.js`.

```js
module.exports = ({ model }) => {
  return {
    getAll: async function(params) {
      // this refers to the Mongoose model called in the query
      // ex: strapi.plugins['my-plugin'].queries('Product').getAll(), this will be equal to the product Mongoose model.
      return model.find(params);
    },
  };
};
```

Bookshelf ORM generic queries:

**Path —** `./plugins/my-plugin/api/config/queries/bookshelf/index.js`.

```js
module.exports = ({ model }) => {
  return {
    getAll: async function(params) {
      // this refers to the Bookshelf model called in the query
      // ex: strapi.plugins['my-plugin'].queries('Product').getAll(), this will be equal to the product Bookshelf model.
      return model.fetchAll(params);
    },
  };
};
```

Usage from the plugin:

**Path —** `./plugins/my-plugin/api/controllers/index.js`.

```js
module.exports = {
  getUsers: async () => {
    // Get parameters from the request
    const { limit, sort } = ctx.request.query;

    // Get the list of users using the plugin's queries
    const users = await strapi.plugins['my-plugin']
      .queries('User')
      .getAll({ limit, sort });

    // Send the list of users as response
    ctx.body = users;
  },
};
```

---
