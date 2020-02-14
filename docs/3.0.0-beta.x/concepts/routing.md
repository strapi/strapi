# Routing

## Concept

`./api/**/config/routes.json` files define all available endpoints for the clients.

By default Strapi generate endpoints for all your Content Types. More information in the [Content API](../content-api/api-endpoints.md) documentation.

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
      "method": ["POST", "PUT"],
      "path": "/restaurants/:id",
      "handler": "Restaurant.createOrUpdate",
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
  - `policies` (array): Array of policy names or path ([see more](./policies.md)).
  - `prefix` (string): Set a prefix to this route. Also, it will be loaded into the main router (useful feature for a plugin).

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

## Override default route

By default, the main route of the server `/` is pointed to the `/public/index.html` file. To override this behavior, you need to create a route with an empty path `/` in one of the `routes.json` files of your API folder (`/api/**/config/routes.json`).

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "Controller.name",
      "config": {
        "policies": []
      }
    }
  ]
}
```
