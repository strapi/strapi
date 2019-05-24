# Policies

 See the [policies' concepts](../concepts/concepts.md#policies) for details.

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

::: note
You can access to any controllers, services or models thanks to the global variable `strapi` in a policy.
:::

## Usage

To apply policies to a route, you need to associate an array of policies to it. As explained in the [policies' concepts](../concepts/concepts.md#policies), there are two kinds of policies: global or scoped.

### Global policies

Refer to the [concept](../concepts/concepts.md#policies) for details.

The global policies can be associated to any routes in your project.

**Path —** `./api/car/routes.json`.
```js
{
  "routes": [
    {
      "method": "GET",
      "path": "/cars",
      "handler": "Car.find",
      "config": {
        "policies": [
          "global.isAuthenticated"
        ]
      }
    }
  ]
}
```

Before executing the `find` action in the `Car.js` controller, the global policy `isAuthenticated` located in `./config/policies/isAuthenticated.js` will be called.

::: note
You can put as much policy you want in this array. However be careful about the performance impact.
:::

### Plugins policies

Plugins can add and expose policies into your app. For example, the plugin `Auth` (COMING SOON) comes with several useful policies to ensure that the user is well authenticated or has the rights to perform an action.

**Path —** `./api/car/config/routes.json`.
```js
{
  "routes": [
    {
      "method": "GET",
      "path": "/cars",
      "handler": "Car.find",
      "config": {
        "policies": [
          "plugins.users-permissions.isAuthenticated"
        ]
      }
    }
  ]
}
```

The policy `isAuthenticated` located in the `users-permissions` plugin will be executed before the `find` action in the `Car.js` controller.

### Scoped Policies

The scoped policies can only be associated to the routes defined in the API where they have been declared.

**Path —** `./api/car/config/policies/isAdmin.js`.
```js
module.exports = async (ctx, next) => {
  if (ctx.state.user.role.name === 'Administrator') {
    // Go to next policy or will reach the controller's action.
    return await next();
  }

  ctx.unauthorized(`You're not allowed to perform this action!`);
};
```

**Path —** `./api/car/config/routes.json`.
```js
{
  "routes": [
    {
      "method": "GET",
      "path": "/cars",
      "handler": "Car.find",
      "config": {
        "policies": [
          "isAdmin"
        ]
      }
    }
  ]
}
```

The policy `isAdmin` located in `./api/car/config/policies/isAdmin.js` will be executed before the `find` action in the `Car.js` controller.

::: note
The policy `isAdmin` can only be applied to the routes defined in the `/api/car` folder.
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
    ctx.body = 'We cannot find the ressource.';
  }
};
```
