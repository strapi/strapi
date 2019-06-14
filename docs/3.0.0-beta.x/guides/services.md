# Services

See the [services concept](../concepts/concepts.md#services) for an overview.

## Core services

When you create a new Content type or a new model. You will see a new empty service has been created. It is because Strapi builds a generic service for your models by default and allows you to override and extend it in the generated files.

### Extending a Model Service

Here are the core methods (and their current implementation).
You can simply copy and paste this code to your own service file to customize the methods.

You can read about `strapi.query` calls [here](./queries.md)

::: warning
In the following example your controller, service and model is named `product`
:::

#### `find`

```js
module.exports = {
  /**
   * Promise to fetch all records
   *
   * @return {Promise}
   */
  find(params, populate) {
    return strapi.query(Product).find(params, populate);
  },
};
```

#### `findOne`

```js
module.exports = {
  /**
   * Promise to fetch record
   *
   * @return {Promise}
   */

  findOne(params, populate) {
    return strapi.query(Product).findOne(params, populate);
  },
};
```

#### `count`

```js
module.exports = {
  /**
   * Promise to count record
   *
   * @return {Promise}
   */

  count(params) {
    return strapi.query(Product).count(params);
  },
};
```

#### `create`

```js
module.exports = {
  /**
   * Promise to add record
   *
   * @return {Promise}
   */

  create(values) {
    return strapi.query(Product).create(values);
  },
};
```

#### `update`

```js
module.exports = {
  /**
   * Promise to edit record
   *
   * @return {Promise}
   */

  update(params, values) {
    return strapi.query(Product).update(params, values);
  },
};
```

#### `delete`

```js
module.exports = {
  /**
   * Promise to delete a record
   *
   * @return {Promise}
   */

  delete(params) {
    return strapi.query(Product).delete(params);
  },
};
```

#### `search`

```js
module.exports = {
  /**
   * Promise to search records
   *
   * @return {Promise}
   */

  search(params) {
    return strapi.query(Product).search(params);
  },
};
```

#### `countSearch`

```js
module.exports = {
  /**
   * Promise to count searched records
   *
   * @return {Promise}
   */
  countSearch(params) {
    return strapi.query(Product).countSearch(params);
  },
};
```

## Custom services

You can also create custom services to build your own business logic.

### How to create a custom service

There are two ways to create a service.

- Using the CLI `strapi generate:service product`. Read the [CLI documentation](../cli/CLI.md) for more information.
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

::: note
please make sure you installed `nodemailer` (`npm install nodemailer`) for this example.
:::

The service is now available through the `strapi.services` global variable. We can use it in another part of our codebase. For example a controller like below:

**Path —** `./api/user/controllers/User.js`.

```js
module.exports = {
  // GET /hello
  signup: async ctx => {
    // Store the new user in database.
    const user = await User.create(ctx.params);

    // Send an email to validate his subscriptions.
    strapi.services.email.send(
      'welcome@mysite.com',
      user.email,
      'Welcome',
      '...'
    );

    // Send response to the server.
    ctx.send({
      ok: true,
    });
  },
};
```
