# Filters

## Programmatic usage

Requests system can be implemented in custom code sections.

### Extracting requests filters

To extract the filters from an JavaScript object or a request, you need to call the [`strapi.utils.models.convertParams` helper](../global-strapi/reference.md#strapiutils).

::: note
The returned objects is formatted according to the ORM used by the model.
:::

#### Example

**Path —** `./api/user/controllers/User.js`.

```js
// Define a list of params.
const params = {
  _limit: 20,
  _sort: 'email',
};

// Convert params.
const formattedParams = strapi.utils.models.convertParams('user', params); // { limit: 20, sort: 'email' }
```

### Query usage

#### Example

**Path —** `./api/user/controllers/User.js`.

```js
module.exports = {

  find: async (ctx) => {
    // Convert params.
    const formattedParams = strapi.utils.models.convertParams('user', ctx.request.query);

    // Get the list of users according to the request query.
    const filteredUsers = await User
      .find()
      .where(formattedParams.where)
      .sort(formattedParams.sort)
      .skip(formattedParams.start)
      .limit(formattedParams.limit);

    // Finally, send the results to the client.
    ctx.body = filteredUsers;
  };
};
```
