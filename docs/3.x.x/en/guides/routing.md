# Routing

See the [routing's concept](../concepts/concepts.md#routing) for details.

## How to create a route?

You have to edit the `routes.json` file in one of your APIs folders (`./api/**/config/routes.json`) and manually add a new route object into the `routes` array.

**Path —** `./api/**/config/routes.json`.
```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/product",
      "handler": "Product.find",
    },
    {
      "method": ["POST", "PUT"],
      "path": "/product/:id",
      "handler": "Product.createOrUpdate",
    },
    {
      "method": "POST",
      "path": "/product/:id/buy",
      "handler": "Product.buy",
      "config": {
        "policies": ["isAuthenticated", "hasCreditCard"]
      }
    }
  ]
}
```

- `method` (string): Method or array of methods to hit the route (ex: `GET`, `POST`, `PUT`, `HEAD`, `DELETE`, `PATCH`)
- `path` (string): URL starting with `/` (ex: `/product`)
- `handler` (string): Action to executed when the route is hit following this syntax `<Controller>.<action>`
- `config`
  - `policies` (array): Array of policies names or path ([see more](../guides/policies.md))
  - `prefix` (string): Set a prefix to this route. Also, it will be loaded into the main router (useful feature for plugin)

## Dynamic parameters

The router used by Strapi allows you to create dynamic routes where you can use parameters and simple regular expressions. These parameters will be exposed in the `ctx.params` object. For more details, please refer to the [PathToRegex](https://github.com/pillarjs/path-to-regexp) documentation.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/product/:category/:id",
      "handler": "Product.findOneByCategory",
    },
    {
      "method": "GET",
      "path": "/product/:region(\\d{2}|\\d{3})/:id", // Only match when the first parameter contains 2 or 3 digits.
      "handler": "Product.findOneByRegion",
    }
  ]
}
```

## Override default route

By default, the main route of the server `/` is pointed to the `/public/index.html` file. To override this behavior, you need to create a route with an empty path `/` in one of your API folder (`/api/**/config/routes.json`).

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "Controller.name",
    }
  ]
}
```
