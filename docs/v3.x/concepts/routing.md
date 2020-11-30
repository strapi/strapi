# Routing

## Concept

`./api/**/config/routes.json` files define all available endpoints for the clients.

By default, Strapi generates endpoints for all your Content Types. More information is in the [Content API](../content-api/api-endpoints.md) documentation.

## How to create a route?

You have to edit the `routes.json` file in one of your APIs folders (`./api/**/config/routes.json`) and manually add a new route object into the `routes` array.

**Path —** `./api/**/config/routes.json`.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/restaurants",
      "handler": "Restaurant.find",
      "config": {
        "policies": []
      }
    },
    {
      "method": "PUT",
      "path": "/restaurants/bulkUpdate",
      "handler": "Restaurant.bulkUpdate",
      "config": {
        "policies": []
      }
    },
    {
      "method": "POST",
      "path": "/restaurants/:id/reservation",
      "handler": "Restaurant.reservation",
      "config": {
        "policies": ["isAuthenticated", "hasCreditCard"]
      }
    }
  ]
}
```

- `method` (string): Method or array of methods to hit the route (e.g. `GET`, `POST`, `PUT`, `HEAD`, `DELETE`, `PATCH`).
- `path` (string): URL starting with `/` (e.g. `/restaurants`).
- `handler` (string): Action to execute when the route is hit following this syntax `<Controller>.<action>`.
- `config`
  - `policies` (array): Array of policy names or paths ([see more](./policies.md))

::: tip
You can exclude the entire `config` object if you do not want the route to be checked by the [Users & Permissions plugin](../plugins/users-permissions.md).
:::

## Dynamic parameters

The router used by Strapi allows you to create dynamic routes where you can use parameters and simple regular expressions. These parameters will be exposed in the `ctx.params` object. For more details, please refer to the [PathToRegex](https://github.com/pillarjs/path-to-regexp) documentation.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/restaurants/:category/:id",
      "handler": "Restaurant.findOneByCategory",
      "config": {
        "policies": []
      }
    },
    {
      "method": "GET",
      "path": "/restaurants/:region(\\d{2}|\\d{3})/:id", // Only match when the first parameter contains 2 or 3 digits.
      "handler": "Restaurant.findOneByRegion",
      "config": {
        "policies": []
      }
    }
  ]
}
```

### Example

Route definition with URL params

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/restaurants/:id",
      "handler": "Restaurant.findOne",
      "config": {
        "policies": []
      }
    }
  ]
}
```

Get the URL param in the controller

```js
module.exports = {
  findOne: async ctx => {
    // const id = ctx.params.id;
    const { id } = ctx.params;
    return id;
  },
};
```
