# Controllers

See the [controllers' concepts](../concepts/concepts.md#controllers) for a simple overview.

## Core controllers

When you create a new Content type or a new model. You will see a new empty controller has been created. It is because Strapi builds a generic controller for your models by default and allows you to override and extend it in the generated files.

### Extending a Model Controller

Here are the core methods (and their current implementation).
You can simply copy and paste this code in your own controller file to customize the methods.

::: warning
In the following example we will consider your controller, service and model is named `product`
:::

#### `find`

```js
module.exports = {
  /**
   * Retrieve records.
   *
   * @return {Array}
   */

  find(ctx) {
    if (ctx.query._q) {
      return strapi.services.product.search(ctx.query);
    }
    return strapi.services.product.find(ctx.query);
  },
};
```

#### `findOne`

```js
module.exports = {
  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  findOne(ctx) {
    return strapi.services.product.findOne(ctx.params);
  },
};
```

#### `count`

```js
module.exports = {
  /**
   * Count records.
   *
   * @return {Number}
   */

  count(ctx) {
    if (ctx.query._q) {
      return strapi.services.product.countSearch(ctx.query);
    }
    return strapi.services.product.count(ctx.query);
  },
};
```

#### `create`

```js
module.exports = {
  /**
   * Create a record.
   *
   * @return {Object}
   */

  create(ctx) {
    return strapi.services.product.create(ctx.request.body);
  },
};
```

#### `update`

```js
module.exports = {
  /**
   * Update a record.
   *
   * @return {Object}
   */

  update(ctx) {
    return strapi.services.product.update(ctx.params, ctx.request.body);
  },
};
```

#### `delete`

```js
module.exports = {
  /**
   * delete a record.
   *
   * @return {Object}
   */

  delete(ctx) {
    return strapi.services.product.delete(ctx.params);
  },
};
```

## Custom controllers

You can also create custom controllers to build your own business logic and API endpoints.

### How to create a custom controller

There are two ways to create a controller:

- Using the CLI `strapi generate:controller product`. Read the [CLI documentation](../cli/CLI.md#strapi-generatecontroller) for more information.
- Manually create a JavaScript file in `./api/**/controllers`.

### Adding Endpoints

Each controller’s action must be an `async` function.
Every action receives a `context` (`ctx`) object as first parameter containing the [request context](../guides/requests.md) and the [response context](../guides/responses.md).

::: note
Every action must be referenced by a route.
:::

### Example

In this example, we are defining a specific route in `./api/hello/config/routes.json` that takes `Hello.index` as handler.

It means that every time a request `GET /hello` is sent to the server, Strapi will call the `index` action in the `Hello.js` controller.
Our `index` action will return `Hello World!`. You can also return a JSON object.

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
  index: async ctx => {
    ctx.send('Hello World!');
  },
};
```

::: note
A route handler can only access the controllers defined in the `./api/**/controllers` folders.
:::
