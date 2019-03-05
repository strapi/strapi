# Controllers

See the [controllers' concepts](../concepts/concepts.md#controllers) for details.

## How to create a controller?

There are two ways to create a controller:
 - Using the CLI `strapi generate:controller user`. Read the [CLI documentation](../cli/CLI.md#strapi-generatecontroller) for more information.
 - Manually create a JavaScript file named `User.js` in `./api/**/controllers` which contains at least one [endpoint](#adding-endpoints).

## Adding Endpoints

Each controller’s action must be an `async` function and receives the `context` (`ctx`) object as first parameter containing the [request context](../guides/requests.md) and the [response context](../guides/responses.md). The action has to be bounded by a route.

#### Example

In this example, we are defining a specific route in `./api/hello/config/routes.json` that takes `Hello.index` as handler. It means that every time a web browser is pointed to the `/hello` URL, the server will call the `index` action in the `Hello.js` controller. Our `index` action will return `Hello World!`. You can also return a JSON object.

**Path —** `./api/hello/config/routes.json`.
```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/hello",
      "handler": "Hello.index"
    }
  ]
}
```

**Path —** `./api/hello/controllers/Hello.js`.
```js
module.exports = {
  // GET /hello
  index: async (ctx) => {
    ctx.send('Hello World!');
  }
};
```

::: note
A route handler can only access the controllers defined in the `./api/**/controllers` folders.
:::
