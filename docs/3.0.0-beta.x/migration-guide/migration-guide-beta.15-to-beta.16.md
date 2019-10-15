# Migration guide from beta.15 to beta.16

Upgrading your Strapi application to `v3.0.0-beta.16`.

## Upgrading your dependencies

Start by upgrading all your strapi package version to `3.0.0-beta.16`.

Your package.json would look like this:

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.16",
    "strapi-admin": "3.0.0-beta.16",
    "strapi-hook-bookshelf": "3.0.0-beta.16",
    "strapi-hook-knex": "3.0.0-beta.16",
    "strapi-plugin-content-manager": "3.0.0-beta.16",
    "strapi-plugin-content-type-builder": "3.0.0-beta.16",
    "strapi-plugin-email": "3.0.0-beta.16",
    "strapi-plugin-graphql": "3.0.0-beta.16",
    "strapi-plugin-settings-manager": "3.0.0-beta.16",
    "strapi-plugin-upload": "3.0.0-beta.16",
    "strapi-plugin-users-permissions": "3.0.0-beta.16",
    "strapi-utils": "3.0.0-beta.16"
  }
}
```

Then run either `yarn install` or `npm install`.

## Building your administration panel

This new release introduces changes to the administration panel that require a rebuild.

Start by deleting your current build:

```bash
rm -rf ./build
```

Build the administration panel:

```bash
yarn build
# or
npm run build
```

## Updating your code

### Wysiwyg

Wysiwyg was previously an option of the `text` type that was stored in the database. When deploying to production for the first time you had to re-select the option in the interface.

To make sure a Wysiwyg field stays the same when deploying, we introduced the `richtext` type. This type is equivalent to the previous `text` type with `wysiwyg` option enabled.

**Before**:

```json
{
  //...
  "attributes": {
    "name": {
      "type": "string"
    }
    "description": {
      "type": "text"
    }
  }
}
```

**After**:

```json
{
  //...
  "attributes": {
    "name": {
      "type": "string"
    }
    "description": {
      "type": "richtext"
    }
  }
}
```

### Custom controllers and services

If you are using [core services](../guides/services.md), you previously needed to call `result.toJSON()` or `result.toObject()` to get a plain javascript object. This is not the case anymore, you will now receive a simple object directly.

**Before**:

```js
module.exports = {
  async findOne(id) {
    const result = await strapi.services.restaurant.findOne(id);
    return result.toJSON();
  },
};
```

**After**:

```js
module.exports = {
  findOne(id) {
    return strapi.services.restaurant.findOne(id);
  },
};
```

The same modification was made to `strapi.query()`. Read more about **Queries** [here](../guides/queries.md).

Keep in mind that if you are running custom ORM queries with Bookshelf or Mongoose you will still have to call `toJSON` or `toObject`. Check out this section about [custom queries](../guides/queries.html#api-reference).

### Bootstrap function

The function exported in `config/functions/bootstrap.js` previously received a callback. This is not the case anymore. You can either use an async function, return a promise or simply run a synchronous function.

**Before**

```js
module.exports = {
  defaults: {},
  initialize(cb) {
    // code
    cb();
  },
};
```

**After**

**Async**

```js
module.exports = async () => {
  await someOperation();
};
```

**Promise**

```js
module.exports = () => {
  return new Promise(/* ... */);
};
```

**Sync**

```js
module.exports = () => {
  someSyncCode();
};
```

**No Function**

```js
module.exports = () => {};
```

### Custom hooks

If you have custom [hooks](../advanced/hooks.md) in your project, the `initialize` function will not receive a callback anymore. You can either use an async function, return a promise or simply run a synchronous function.

**Before**

```js
module.exports = {
  defaults: {},
  initialize(cb) {
    // code
    cb();
  },
};
```

**After**

**Async**

```js
module.exports = {
  defaults: {},
  async initialize() {
    await someOperation();
  },
};
```

**Promise**

```js
module.exports = {
  defaults: {},
  initialize() {
    return new Promise(/* ... */);
  },
};
```

**Sync**

```js
module.exports = {
  defaults: {},
  initialize() {
    someSyncCode();
  },
};
```
