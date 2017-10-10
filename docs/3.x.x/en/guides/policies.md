# Policies

Check out the [policies' concepts](../concepts/concepts.md#policies) for concepts informations.

## How to create a policy?

There is several ways to create a policy.
 - Using the CLI `strapi generate:policy isAuthenticated`. Read the [CLI documentation](../cli/CLI.md) for more information.
 - Manually create a JavaScript file named `isAuthenticated.js` in `./config/policies/` or `./api/**/config/policies/`.

**Path —** `./config/policies/isAuthenticated.js`.
```js
module.exports = async (ctx, next) => {
  if (ctx.session.isAuthenticated === true) {
    // Go to next policy or will reach the controller's action.
    return await next();
  }

  ctx.unauthorized(`You're not logged!`);
};
```

In this example, we are verifying that a session is open. If it is the case, we are calling the `next()` method that will execute the next policy or controller's action. Otherwise, a 401 error is returned.

> Note: You can access to any controllers, services or models thanks to the global variable `strapi` in a policy.

## Usage

To apply policies to a route, you need to associate an array of policies to it. As explained in the [policies' concepts](../concepts/concepts.md#policies), there are two kinds of policies: global or scoped.

### Global policies
See the [concept](../concepts/concepts.md#policies) for details.

The global policies can be associated to any routes in your project.

**Path —** `./api/car/routes.json`.
```js
{
  "routes": [
    {
      "method": "GET",
      "path": "/car",
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

> Note: You can put as much policy you want in this array. However be careful about the performance impact.

### Plugins policies

Plugins can add and expose policies into your app. For example, the plugin `Auth` comes with several useful policies to ensure that the user is well authenticated or has the rights to perform an action.

**Path —** `./api/car/config/routes.json`.
```js
{
  "routes": [
    {
      "method": "GET",
      "path": "/car",
      "handler": "Car.find",
      "config": {
        "policies": [
          "plugins.auth.isAuthenticated"
        ]
      }
    }
  ]
}
```

The policy `isAuthenticated` located in `./plugins/auth/config/policies/isAuthenticated.js` will be executed before the `find` action in the `Car.js` controller.

### Scoped Policies

The scoped policies can only be associated to the routes defining in the API where they have been declared.

**Path —** `./api/car/config/policies/isAdmin.js`.
```js
module.exports = async (ctx, next) => {
  if (ctx.session.user.role === 'administrator') {
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
      "path": "/car",
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

> Note: The policy `isAdmin` can only be applied to the routes defined in the `/api/car` folder.
