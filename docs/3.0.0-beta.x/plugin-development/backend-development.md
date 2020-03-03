# Back-end Development

This section explains how the 'back-end part' of your plugin works.

## Routes

The plugin API routes are defined in the `./plugins/**/config/routes.json` file.

::: tip
Please refer to [router documentation](../concepts/routing.md) for information.
:::

**Route prefix**

Each route of a plugin is prefixed by the name of the plugin (eg: `/my-plugin/my-plugin-route`).

To disable the prefix, add the `prefix` attribute to each concerned route, like below:

```json
{
  "method": "GET",
  "path": "/my-plugin-route",
  "handler": "MyPlugin.action",
  "config": {
    "policies": [],
    "prefix": false
  }
}
```

## CLI

The CLI can be used to generate files in the plugins folders.

Please refer to the [CLI documentation](../cli/CLI.md) for more information.

## Controllers

Controllers contain functions executed according to the requested route.

Please refer to the [Controllers documentation](../concepts/controllers.md) for more information.

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

Please refer to the [Models documentation](../concepts/models.md) for more information.

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
        "policies": ["global::isAuthenticated"]
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
        "policies": ["plugins::myplugin.isAuthenticated"]
      }
    }
  ]
}
```

Please refer to the [Policies documentation](../concepts/policies.md) for more information.
