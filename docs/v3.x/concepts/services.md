# Services

## Concept

Services are a set of reusable functions. They are particularly useful to respect the DRY (don’t repeat yourself) programming concept and to simplify [controllers](./controllers.md) logic.

## Core services

When you create a new `Content Type` or a new model, you will see a new empty service has been created. It is because Strapi builds a generic service for your models by default and allows you to override and extend it in the generated files.

### Extending a Model Service

Here are the core methods (and their current implementation).
You can simply copy and paste this code to your own service file to customize the methods.

You can read about `strapi.query` calls [here](./queries.md).

::: tip
In the following example your controller, service and model are named `restaurant`.
:::

#### Collection Type

:::: tabs

::: tab find

#### `find`

```js
module.exports = {
  /**
   * Promise to fetch all records
   *
   * @return {Promise}
   */
  find(params, populate) {
    return strapi.query('restaurant').find(params, populate);
  },
};
```

- `params` (object): this represent filters for your find request.<br>
  The object follow the URL query format, [refer to this documentation.](../content-api/parameters.md).

```json
{
  "name": "Tokyo Sushi"
}
// or
{
  "_limit": 20,
  "name_contains": "sushi"
}
```

- `populate` (array): you have to mention data you want populate `["author", "author.name", "comment", "comment.content"]`

:::

::: tab findOne

#### `findOne`

```js
module.exports = {
  /**
   * Promise to fetch record
   *
   * @return {Promise}
   */

  findOne(params, populate) {
    return strapi.query('restaurant').findOne(params, populate);
  },
};
```

- `params` (object): this represent filters for your find request.<br>
  The object follow the URL query format, [refer to this documentation.](../content-api/parameters.md).

```json
{
  "name": "Tokyo Sushi"
}
// or
{
  "name_contains": "sushi"
}
```

- `populate` (array): you have to mention data you want populate `["author", "author.name", "comment", "comment.content"]`

:::

::: tab count

#### `count`

```js
module.exports = {
  /**
   * Promise to count record
   *
   * @return {Promise}
   */

  count(params) {
    return strapi.query('restaurant').count(params);
  },
};
```

- `params` (object): this represent filters for your find request.<br>
  The object follow the URL query format, [refer to this documentation.](../content-api/parameters.md).

```json
{
  "name": "Tokyo Sushi"
}
// or
{
  "name_contains": "sushi"
}
```

:::

::: tab create

#### `create`

```js
module.exports = {
  /**
   * Promise to add record
   *
   * @return {Promise}
   */

  async create(data, { files } = {}) {
    const entry = await strapi.query('restaurant').create(data);

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'restaurant',
        // if you are using a plugin's model you will have to add the `plugin` key (plugin: 'users-permissions')
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },
};
```

:::

::: tab update

#### `update`

```js
module.exports = {
  /**
   * Promise to edit record
   *
   * @return {Promise}
   */

  async update(params, data, { files } = {}) {
    const entry = await strapi.query('restaurant').update(params, data);

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'restaurant',
        // if you are using a plugin's model you will have to add the `plugin` key (plugin: 'users-permissions')
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },
};
```

- `params` (object): it should look like this `{id: 1}`

:::

::: tab delete

#### `delete`

```js
module.exports = {
  /**
   * Promise to delete a record
   *
   * @return {Promise}
   */

  delete(params) {
    return strapi.query('restaurant').delete(params);
  },
};
```

- `params` (object): it should look like this `{id: 1}`

:::

::: tab search

#### `search`

```js
module.exports = {
  /**
   * Promise to search records
   *
   * @return {Promise}
   */

  search(params) {
    return strapi.query('restaurant').search(params);
  },
};
```

- `params` (object): this represent filters for your find request.<br>
  The object follow the URL query format, [refer to this documentation.](../content-api/parameters.md).

```json
{
  "name": "Tokyo Sushi"
}
// or
{
  "name_contains": "sushi"
}
```

:::

::: tab countSearch

#### `countSearch`

```js
module.exports = {
  /**
   * Promise to count searched records
   *
   * @return {Promise}
   */
  countSearch(params) {
    return strapi.query('restaurant').countSearch(params);
  },
};
```

- `params` (object): this represent filters for your find request.<br>
  The object follow the URL query format, [refer to this documentation.](../content-api/parameters.md).

```json
{
  "name": "Tokyo Sushi"
}
// or
{
  "name_contains": "sushi"
}
```

:::

::::

#### Single Type

:::: tabs

::: tab find

#### `find`

```js
const _ = require('lodash');

module.exports = {
  /**
   * Promise to fetch the record
   *
   * @return {Promise}
   */
  async find(populate) {
    const results = await strapi.query('restaurant').find({ _limit: 1 }, populate);
    return _.first(results) || null;
  },
};
```

- `populate` (array): you have to mention data you want populate `["author", "author.name", "comment", "comment.content"]`

:::

::: tab createOrUpdate

#### `createOrUpdate`

```js
const _ = require('lodash');

module.exports = {
  /**
   * Promise to add/update the record
   *
   * @return {Promise}
   */

  async createOrUpdate(data, { files } = {}) {
    const results = await strapi.query('restaurant').find({ _limit: 1 });
    const entity = _.first(results) || null;

    let entry;
    if (!entity) {
      entry = await strapi.query('restaurant').create(data);
    } else {
      entry = await strapi.query('restaurant').update({ id: entity.id }, data);
    }

    if (files) {
      // automatically uploads the files based on the entry and the model
      await strapi.entityService.uploadFiles(entry, files, {
        model: 'restaurant',
        // if you are using a plugin's model you will have to add the `plugin` key (plugin: 'users-permissions')
      });
      return this.findOne({ id: entry.id });
    }

    return entry;
  },
};
```

:::

::: tab delete

#### `delete`

```js
module.exports = {
  /**
   * Promise to delete a record
   *
   * @return {Promise}
   */

  delete() {
    const results = await strapi.query('restaurant').find({ _limit: 1 });
    const entity = _.first(results) || null;

    if (!entity) return;

    return strapi.query('restaurant').delete({id: entity.id});
  },
};
```

:::

::::

## Custom services

You can also create custom services to build your own business logic.

### How to create a custom service

There are two ways to create a service.

- Using the CLI `strapi generate:service restaurant`.<br>Read the [CLI documentation](../cli/CLI.md) for more information.
- Manually create a JavaScript file named in `./api/**/services/`.

#### Example

The goal of a service is to store reusable functions. An `email` service could be useful to send emails from different functions in our codebase:

**Path —** `./api/email/services/Email.js`.

```js
const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport.
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'user@gmail.com',
    pass: 'password',
  },
});

module.exports = {
  send: (from, to, subject, text) => {
    // Setup e-mail data.
    const options = {
      from,
      to,
      subject,
      text,
    };

    // Return a promise of the function that sends the email.
    return transporter.sendMail(options);
  },
};
```

::: tip
please make sure you installed `nodemailer` (`npm install nodemailer`) for this example.
:::

The service is now available through the `strapi.services` global variable. We can use it in another part of our codebase. For example a controller like below:

**Path —** `./api/user/controllers/User.js`.

```js
module.exports = {
  // GET /hello
  signup: async ctx => {
    // Store the new user in database.
    const user = await User.create(ctx.query);

    // Send an email to validate his subscriptions.
    strapi.services.email.send('welcome@mysite.com', user.email, 'Welcome', '...');

    // Send response to the server.
    ctx.send({
      ok: true,
    });
  },
};
```
