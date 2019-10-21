# Parameters

## Concept

You can use `strapi-utils` to parse the query params to Strapi's standards filters programmatically if you need it.

## Extracting requests filters

To transform the query params to Strapi's standard filters a request, you can use the `convertRestQueryParams` function from [strapi-utils](../global-strapi/api-reference.md#strapiutils).

```js
const { convertRestQueryParams } = require('strapi-utils');

module.exports = {
  // when sending a request like GET /products?_sort:id&id=1
  fetchExpensiveProducts: (params, populate) => {
    const filters = convertRestQueryParams(params);

    /**
     *  filters = {
     *    start: 0,
     *    limit: 10,
     *    sort: [{ field: 'id', order: 'desc' }],
     *    where: [
     *      { field: 'id', operator: 'eq', value: 1 },
     *    ]
     * }
     */

    // do sth with them
  },
};
```

## Querying data

We added a new API to query data base on the new filters API.

```js
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = {
  find: async (ctx) => {
    // Convert params.
    const filter = convertRestQueryParams(ctx.request.query);

    return buildQuery({
      model: Article
      filters,
      populate: []
    });
  };
};
```

### SQL databases (strapi-hook-bookshelf)

If you are using a SQL database, calling `buildQuery` will return a [`Bookshelf Query`](https://bookshelfjs.org/api.html) on which you can call other functions (e.g `count`)

### Mongo database

If you are using a mongo database calling `buildQuery` returns either a [`Mongoose Query`](https://mongoosejs.com/docs/api.html#Query) or a custom query when used with deep filtering.

#### Custom Query

When using the deep filtering feature with mongo, we build an aggregation query to avoid too many round-trips with the mongo DB.
Doing that means we don't get a Mongoose object as a response but instead a plain JS Object. This brings a some issues like no virtual fields available and no Mongoose lifecycles.

To deliver the best possible experience, we decided to rehydrate the Mongoose models, forcing us to override the Mongoose query

```js
const query = buildQuery({
  model: Product, // you can use any models from strapi.models or strapi.plugins[pluginName].models
  filters: { limit: 10 },
  populate: [],
});
```

returns a query with the following functions

- `count` => Returns an integer equal to the number of matching entities
- `lean` => Returns the matching elements as Objects
- `then(onSucces, onFailure)` => Calls the onSucces with an array of Mongoose objects.
- `catch(onError)` => Promise catch
- `group(options)` => Calls the aggregation group function of mongoose
