# Controllers

See the [controllers' concepts](../concepts/concepts.md#controllers) for a simple overview.

## Core controllers

When you create a new Content type or a new model. You will see a new empty controller has been created. It is because Strapi builds a generic controller for your models by default and allows you to override and extend it in the generated files.

### Extending a Model Controller

Here are the core methods (and their current implementation).
You can simply copy and paste this code in your own controller file to customize the methods.

::: warning
In the following example we will consider your controller, service and model is named `restaurant`
:::

#### Utils

First require the utility functions

```js
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
```

- `parseMultipartData`: This function parses strapi's formData format.
- `sanitizeEntity`: This function removes all private fields from the model and its relations.

#### `find`

```js
module.exports = {
  /**
   * Retrieve records.
   *
   * @return {Array}
   */

  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await service.search(ctx.query);
    } else {
      entities = await service.find(ctx.query);
    }

    return entities.map(entity => sanitizeEntity(entity, { model }));
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

  async findOne(ctx) {
    const entity = await service.findOne(ctx.params);
    return sanitizeEntity(entity, { model });
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
      return service.countSearch(ctx.query);
    }
    return service.count(ctx.query);
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

  async create(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await service.create(data, { files });
    } else {
      entity = await service.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model });
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

  async update(ctx) {
    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await service.update(ctx.params, data, { files });
    } else {
      entity = await service.update(ctx.params, ctx.request.body);
    }

    return sanitizeEntity(entity, { model });
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

  async delete(ctx) {
    const entity = await service.delete(ctx.params);
    return sanitizeEntity(entity, { model });
  },
};
```

## Custom controllers

You can also create custom controllers to build your own business logic and API endpoints.

### How to create a custom controller

There are two ways to create a controller:

- Using the CLI `strapi generate:controller restaurant`. Read the [CLI documentation](../cli/CLI.md#strapi-generatecontroller) for more information.
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
