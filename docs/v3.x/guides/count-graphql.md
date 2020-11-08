# Count with GraphQL

This guide explains how to count data with a GraphQL query.

The count aggregation currently has some issues and this feature is also not available for Bookshelf (SQL databases).

With this guide we will code our own count query.

Here is the [GraphQL documentation](../plugins/graphql.md#customise-the-graphql-schema) which we will use to achieve our goal.

## Setup the application

In this example, we will use a **Restaurant** API.

Make sure you have a **Content Type** with some entries.

## Create schema.graphql file

To be able to add a new custom query (or mutation), we will have to create a `schema.graphql.js` file in your **Restaurant** API.

**Path** — `./api/restaurant/config/schema.graphql.js`

```js
module.exports = {
  query: ``,
  resolver: {
    Query: {},
  },
};
```

## Create count query

The `count` query will call the [`count`](../concepts/services.md#core-services) service function of the **Restaurant** API.

It needs a JSON object as params, so we will add a `where` options in the GraphQL query.

**Path** — `./api/restaurant/config/schema.graphql.js`

```js
module.exports = {
  query: `
    restaurantsCount(where: JSON): Int!
  `,
  resolver: {
    Query: {
      restaurantsCount: {
        description: 'Return the count of restaurants',
        resolverOf: 'application::restaurant.restaurant.count',
        resolver: async (obj, options, ctx) => {
          return await strapi.api.restaurant.services.restaurant.count(options.where || {});
        },
      },
    },
  },
};
```

And tada, you can now request the `count` of your Content Type.

## Query example

- Count all restaurants

```
{
  restaurantsCount
}
```

- Count all restaurants that have `_3rd` as district value.

Based on the [FoodAdvisor](https://github.com/strapi/foodadvisor) restraurant model.

```
{
  restaurantsCount(where: { district: "_3rd" })
}
```
