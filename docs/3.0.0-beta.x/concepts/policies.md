# Policies

## Concept

Policies are functions which have the ability to execute specific logic on each request before it reaches the controller's action. They are mostly used for securing business logic easily.
Each route of the project can be associated to an array of policies. For example, you can create a policy named `isAdmin`, which obviously checks that the request is sent by an admin user, and use it for critical routes.

Policies can be:

- `global`: so they can be used within the entire project.
- `scoped`: used by single API or plugin.

### Where are the policies defined?

The API and plugins policies (scoped) are defined in each `./api/**/config/policies/` folders and plugins. They are respectively exposed through `strapi.api.**.config.policies` and `strapi.plugins.**.config.policies`. The global policies are defined at `./config/policies/` and accessible via `strapi.config.policies`.

### Global policies

Global policies are reusable through the entire app.

### Scoped policies

A policy defined in an API or plugin is usable only from this API or plugin. You don't need any prefix to use it.

### Plugin policies

Plugin policies are usable from any app API.

## How to create a policy?

There are several ways to create a policy.

- Using the CLI `strapi generate:policy isAuthenticated`. Read the [CLI documentation](../cli/CLI.md) for more information.
- Manually create a JavaScript file named `isAuthenticated.js` in `./config/policies/`.

**Path —** `./config/policies/isAuthenticated.js`.

```js
module.exports = async (ctx, next) => {
  if (ctx.state.user) {
    // Go to next policy or will reach the controller's action.
    return await next();
  }

  ctx.unauthorized(`You're not logged in!`);
};
```

In this example, we are verifying that a session is open. If it is the case, we call the `next()` method that will execute the next policy or controller's action. Otherwise, a 401 error is returned.

::: tip
You can access to any controllers, services or models thanks to the global variable `strapi` in a policy.
:::

## Usage

To apply policies to a route, you need to associate an array of policies to it. There are two kinds of policies: global or scoped.

### Global policies

The global policies can be associated to any routes in your project.

**Path —** `./api/restaurant/routes.json`.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/restaurants",
      "handler": "Restaurant.find",
      "config": {
        "policies": ["global.isAuthenticated"]
      }
    }
  ]
}
```

Before executing the `find` action in the `Restaurant.js` controller, the global policy `isAuthenticated` located in `./config/policies/isAuthenticated.js` will be called.

::: tip
You can put as much policy you want in this array. However be careful about the performance impact.
:::

### Plugins policies

Plugins can add and expose policies into your app. For example, the plugin **Users & Permissions** comes with useful policies to ensure that the user is well authenticated or has the rights to perform an action.

**Path —** `./api/restaurant/config/routes.json`.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/restaurants",
      "handler": "Restaurant.find",
      "config": {
        "policies": ["plugins.users-permissions.isAuthenticated"]
      }
    }
  ]
}
```

The policy `isAuthenticated` located in the `users-permissions` plugin will be executed before the `find` action in the `Restaurant.js` controller.

### Scoped Policies

The scoped policies can only be associated to the routes defined in the API where they have been declared.

**Path —** `./api/restaurant/config/policies/isAdmin.js`.

```js
module.exports = async (ctx, next) => {
  if (ctx.state.user.role.name === 'Administrator') {
    // Go to next policy or will reach the controller's action.
    return await next();
  }

  ctx.unauthorized(`You're not allowed to perform this action!`);
};
```

**Path —** `./api/restaurant/config/routes.json`.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/restaurants",
      "handler": "Restaurant.find",
      "config": {
        "policies": ["isAdmin"]
      }
    }
  ]
}
```

The policy `isAdmin` located in `./api/restaurant/config/policies/isAdmin.js` will be executed before the `find` action in the `Restaurant.js` controller.

::: tip
The policy `isAdmin` can only be applied to the routes defined in the `/api/restaurant` folder.
:::

## Advanced usage

As it's explained above, the policies are executed before the controller's action. It looks like an action that you can make `before` the controller's action. You can also execute a logic `after`.

**Path —** `./config/policies/custom404.js`.

```js
module.exports = async (ctx, next) => {
  // Indicate to the server to go to
  // the next policy or to the controller's action.
  await next();

  // The code below will be executed after the controller's action.
  if (ctx.status === 404) {
    ctx.body = 'We cannot find the resource.';
  }
};
```
