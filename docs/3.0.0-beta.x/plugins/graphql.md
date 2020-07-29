# GraphQL

By default Strapi create [REST endpoints](../content-api/api-endpoints.md) for each of your content types. With the GraphQL plugin, you will be able to add a GraphQL endpoint to fetch and mutate your content.

## Usage

To get started with GraphQL in your app, please install the plugin first. To do that, open your terminal and run the following command:

:::: tabs

::: tab yarn

```
yarn strapi install graphql
```

:::

::: tab npm

```
npm run strapi install graphql
```

:::

::: tab strapi

```
strapi install graphql
```

:::

::::

Then, start your app and open your browser at [http://localhost:1337/graphql](http://localhost:1337/graphql). You should see the interface (**GraphQL Playground**) that will help you to write GraphQL query to explore your data.

::: tip
Install the [ModHeader](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj/related) extension to set the `Authorization` header in your request
:::

## Configurations

By default, the [Shadow CRUD](#shadow-crud) feature is enabled and the GraphQL is set to `/graphql`. The Playground is enabled by default for both the development and staging environments, however it is disabled in production. By changing the config option `playgroundAlways` to true, you can enable it.

Security limits on maximum number of items in your response by default is limited to 100, however you can change this on the following config option `amountLimit`. This should only be changed after careful consideration of the drawbacks of a large query which can cause what would basically be a DDoS (Distributed Denial of Service). And may cause abnormal load on your Strapi server, as well as your database server.

You can also enable the Apollo server tracing feature, which is supported by the playground to track the response time of each part of your query. To enable this feature just change/add the `"tracing": true` option in the GraphQL settings file. You can read more about the tracing feature from Apollo [here](https://www.apollographql.com/docs/apollo-server/federation/metrics/).

You can also enable Strapi as an implementing service for Apollo Federation, which allows you to set up Strapi as a service behind an Apollo Federation API gateway and allows you to add Strapi to a single exposed data graph across your organization. You can read more about Apollo Federation [here](https://www.apollographql.com/docs/apollo-server/federation/introduction/).

You can edit these configurations by creating following file.

**Path —** `./extensions/graphql/config/settings.json`.

```json
{
  "endpoint": "/graphql",
  "tracing": false,
  "shadowCRUD": true,
  "playgroundAlways": false,
  "depthLimit": 7,
  "amountLimit": 100,
  "federation": false
}
```

## Query API

In the section, we assume that the [Shadow CRUD](#shadow-crud) feature is enabled. For each model, the plugin auto-generates queries and mutations which just fit to your needs.

### Fetch a single entry

- `id`: String

```graphql
query {
  user(id: "5aafe871ad624b7380d7a224") {
    username
    email
  }
}
```

### Fetch multiple entries

```graphql
query {
  users {
    username
    email
  }
}
```

### Fetch dynamic zone data

Dynamic zones are union types in graphql so you need to use fragments to query the fields.

```graphql
query {
  restaurants {
    dz {
      __typename
      ... on ComponentDefaultClosingperiod {
        label
      }
    }
  }
}
```

### Create a new entry

- `input`: Object
  - `data`: Object — Values to insert

```graphql
mutation {
  createUser(input: { data: { username: "John", email: "john@doe.com" } }) {
    user {
      username
      email
    }
  }
}
```

The implementation of the mutations also supports relational attributes. For example, you can create a new `User` and attach many `Restaurant` to it by writing your query like this:

```graphql
mutation {
  createUser(
    input: {
      data: {
        username: "John"
        email: "john@doe.com"
        restaurants: ["5b51e3949db573a586ad22de", "5b5b26619b0820c1c2fb79c9"]
      }
    }
  ) {
    user {
      username
      email
      restaurant {
        name
        description
        price
      }
    }
  }
}
```

### Update an existing entry

- `input`: Object
  - `where`: Object - Entry's ID to update
  - `data`: Object — Values to update

```graphql
mutation {
  updateUser(
    input: {
      where: { id: "5b28f1747c739e4afb48605c" }
      data: { username: "John", email: "john@doe.com" }
    }
  ) {
    user {
      username
      email
    }
  }
}
```

You can also update relational attributes by passing an ID or an array of IDs (depending on the relationship).

```graphql
mutation {
  updateRestaurant(input: {
    where: {
      id: "5b5b27f8164f75c29c728110"
    },
    data: {
      chef: "5b51e3949db573a586ad22de" // User ID
    }
  }) {
    restaurant {
      chef {
        username
        email
      }
    }
  }
}
```

### Delete an entry

- `input`: Object
  - `where`: Object - Entry's ID to delete

```graphql
mutation {
  deleteUser(input: { where: { id: "5b28f1747c739e4afb48605c" } }) {
    user {
      username
      email
    }
  }
}
```

### Filters

You can also apply different parameters to the query to make more complex queries.

- `limit` (integer): Define the number of returned entries.
- `start` (integer): Define the amount of entries to skip.
- `sort` (string): Define how the data should be sorted.
- `where` (object): Define the filters to apply in the query.
  - `<field>`: Equals.
  - `<field>_ne`: Not equals.
  - `<field>_lt`: Lower than.
  - `<field>_lte`: Lower than or equal to.
  - `<field>_gt`: Greater than.
  - `<field>_gte`: Greater than or equal to.
  - `<field>_contains`: Contains.
  - `<field>_containss`: Contains sensitive.
  - `<field>_in`: Matches any value in the array of values.
  - `<field>_nin`: Doesn't match any value in the array of values.
  - `<field>_null`: Equals null/Not equals null

Return the second decade of users which have an email that contains `@strapi.io` ordered by username.

```graphql
query {
  users(limit: 10, start: 10, sort: "username:asc", where: { email_contains: "@strapi.io" }) {
    username
    email
  }
  restaurants(
    limit: 10
    where: { _id_nin: ["5c4dad1a8f3845222ca88a56", "5c4dad1a8f3845222ca88a57"] }
  ) {
    _id
    name
  }
}
```

Return the users which have been created after the March, 19th 2018 4:21 pm.

```graphql
query {
  users(where: { createdAt_gt: "2018-03-19 16:21:07.161Z" }) {
    username
    email
  }
}
```

## Shadow CRUD

To simplify and automate the build of the GraphQL schema, we introduced the Shadow CRUD feature. It automatically generates the type definition, queries, mutations and resolvers based on your models. The feature also lets you make complex query with many arguments such as `limit`, `sort`, `start` and `where`.

::: tip NOTE
If you use a local plugin, the controller methods of your plugin are not created by default. In order for the Shadow CRUD to work you have to define them in your controllers for each of your models. You can find examples of controllers `findOne`, `find`, `create`, `update` and `delete` there : [Core controllers](../concepts/controllers.md#core-controllers).
:::

### Example

If you've generated an API called `Restaurant` using the CLI `strapi generate:api restaurant` or the administration panel, your model looks like this:

**Path —** `./api/restaurant/models/Restaurant.settings.json`.

```json
{
  "connection": "default",
  "options": {
    "timestamps": true
  },
  "attributes": {
    "name": {
      "type": "string"
    },
    "description": {
      "type": "text"
    },
    "open": {
      "type": "boolean"
    }
  }
}
```

The generated GraphQL type and queries will be:

```graphql
// Restaurant's Type definition
type Restaurant {
  _id: String
  created_at: String
  updated_at: String
  name: String
  description: String
  open: Boolean
}

// Queries to retrieve one or multiple restaurants.
type Query {
  restaurants(sort: String, limit: Int, start: Int, where: JSON): [Restaurant]
  restaurant(id: String!): Restaurant
}

// Mutations to create, update or delete a restaurant.
type Mutation {
  createRestaurant(input: createRestaurantInput): createRestaurantPayload!
  updateRestaurant(input: updateRestaurantInput): updateRestaurantPayload!
  deleteRestaurant(input: deleteRestaurantInput): deleteRestaurantPayload!
}
```

The queries and mutations will use the generated controller's actions as resolvers. It means that the `restaurants` query will execute the `Restaurant.find` action, the `restaurant` query will use the `Restaurant.findOne` action and the `createRestaurant` mutation will use the `Restaurant.create` action, etc.

## Aggregation & Grouping

::: warning
This feature is only available on Mongoose ORM.
:::

Strapi now supports Aggregation & Grouping.
Let's consider again the model mentioned above:

```graphql
type Restaurant {
  _id: ID
  createdAt: String
  updatedAt: String
  name: String
  description: String
  nb_likes: Int
  open: Boolean
}
```

Strapi will generate automatically for you the following queries & types:

### Aggregation

```graphql
type RestaurantConnection {
  values: [Restaurant]
  groupBy: RestaurantGroupBy
  aggregate: RestaurantAggregator
}

type RestaurantGroupBy {
  _id: [RestaurantConnection_id]
  createdAt: [RestaurantConnectionCreatedAt]
  updatedAt: [RestaurantConnectionUpdatedAt]
  name: [RestaurantConnectionTitle]
  description: [RestaurantConnectionContent]
  nb_likes: [RestaurantConnectionNbLikes],
  open: [RestaurantConnectionPublished]
}

type RestaurantConnectionPublished {
  key: Boolean
  connection: RestaurantConnection
}

type RestaurantAggregator {
  count: Int
  sum: RestaurantAggregatorSum
  avg: RestaurantAggregatorAvg
  min: RestaurantAggregatorMin
  max: RestaurantAggregatorMax
}

type RestaurantAggregatorAvg {
  nb_likes: Float
}

type RestaurantAggregatorMin { // Same for max and sum
  nb_likes: Int
}

type Query {
  restaurantsConnection(sort: String, limit: Int, start: Int, where: JSON): RestaurantConnection
}
```

Getting the total count and the average likes of restaurants:

```graphql
query {
  restaurantsConnection {
    aggregate {
      count
      avg {
        nb_likes
      }
    }
  }
}
```

Let's say we want to do the same query but for only open restaurants

```graphql
query {
  restaurantsConnection(where: { open: true }) {
    aggregate {
      count
      avg {
        nb_likes
      }
    }
  }
}
```

Getting the average likes of open and non open restaurants

```graphql
query {
  restaurantsConnection {
    groupBy {
      open {
        key
        connection {
          aggregate {
            avg {
              nb_likes
            }
          }
        }
      }
    }
  }
}
```

Result

```json
{
  "data": {
    "restaurantsConnection": {
      "groupBy": {
        "open": [
          {
            "key": true,
            "connection": {
              "aggregate": {
                "avg": {
                  "nb_likes": 10
                }
              }
            }
          },
          {
            "key": false,
            "connection": {
              "aggregate": {
                "avg": {
                  "nb_likes": 0
                }
              }
            }
          }
        ]
      }
    }
  }
}
```

## Customise the GraphQL schema

If you want to define a new scalar, input or enum types, this section is for you. To do so, you will have to create a `schema.graphql` file. This file has to be placed into the config folder of each API `./api/*/config/schema.graphql` or plugin `./extensions/*/config/schema.graphql`.

**Structure —** `schema.graphql`.

```js
module.exports = {
  definition: ``,
  query: ``,
  type: {},
  resolver: {
    Query: {},
  },
};
```

- `definition` (string): lets you define new type, input, etc.
- `query` (string): where you add custom query.
- `mutation` (string): where you add custom mutation.
- `type` (object): allows you to add description, deprecated field or disable the [Shadow CRUD](#shadow-crud) feature on a specific type.
- `resolver` (object):
  - `Query` (object): lets you define custom resolver, policies for a query.
  - `Mutation` (object): lets you define custom resolver, policies for a mutation.

### Example

Let say we are using the same previous `Restaurant` model.

**Path —** `./api/restaurant/config/schema.graphql`.

```js
module.exports = {
  definition:`
    enum RestaurantStatusInput {
      work
      open
      closed
    }
  `,
  query: `
    restaurantsByChef(id: ID, status: RestaurantStatusInput, limit: Int): [Restaurant]!
  `,
  mutation: `
    attachRestaurantToChef(id: ID, chefID: ID): Restaurant!
  `,
  resolver: {
    Query: {
      restaurant: {
        description: 'Return a single restaurant',
        policies: ['plugins::users-permissions.isAuthenticated', 'isOwner'], // Apply the 'isAuthenticated' policy of the `Users & Permissions` plugin, then the 'isOwner' policy before executing the resolver.
      },
      restaurants: {
        description: 'Return a list of restaurants', // Add a description to the query.
        deprecated: 'This query should not be used anymore. Please consider using restaurantsByChef instead.'
      },
      restaurantsByChef: {
        description: 'Return the restaurants open by the chef',
        resolver: 'application::restaurant.restaurant.findByChef'
      },
      restaurantsByCategories: {
        description: 'Return the restaurants open by the category',
        resolverOf: 'application::restaurant.restaurant.findByCategories', // Will apply the same policy on the custom resolver as the controller's action `findByCategories`.
        resolver: (obj, options, ctx) => {
          // ctx is the context of the Koa request.
          await strapi.controllers.restaurants.findByCategories(ctx);

          return ctx.body.restaurants || `There is no restaurant.`;
        }
      }
    },
    Mutation: {
      attachRestaurantToChef: {
        description: 'Attach a restaurant to an chef',
        policies: ['plugins::users-permissions.isAuthenticated', 'isOwner'],
        resolver: 'application::restaurant.restaurant.attachToChef'
      }
    }
  }
};
```

### Define a new type

Edit the `definition` attribute in one of the `schema.graphql` files of your project by using the GraphQL Type language string.

::: tip
The easiest way is to create a new model using the CLI `strapi generate:model category --api restaurant`, so you don't need to customise anything.
:::

```js
module.exports = {
  definition: `
    type Person {
      id: Int!
      firstname: String!
      lastname: String!
      age: Int
      children: [Person]
    }
  `,
};
```

To explore the data of the new type `Person`, you need to define a query and associate a resolver to this query.

```js
module.exports = {
  definition: `
    type Person {
      id: Int!
      firstname: String!
      lastname: String!
      age: Int
      children: [Person]
    }
  `,
  query: `
    person(id: Int!): Person
  `,
  type: {
    Person: {
      _description: 'The Person type description', // Set the description for the type itself.
      firstname: 'The firstname of the person',
      lastname: 'The lastname of the person',
      age: {
        description: 'The age of the person',
        deprecated: 'We are not using the age anymore, we can find it thanks to our powerful AI'
      },
      children: 'The children of the person'
    }
  }
  resolver: {
    Query: {
      person: {
        description: 'Return a single person',
        resolver: 'application::person.person.findOne' // It will use the action `findOne` located in the `Person.js` controller.
      }
    }
  }
};
```

::: tip
The resolver parameter also accepts an object as a value to target a controller located in a plugin.
:::

```js
module.exports = {
  ...
  resolver: {
    Query: {
      person: {
        description: 'Return a single person',
        resolver: 'plugins::users-permissions.user.findOne'
      }
    }
  }
};
```

### Add description and deprecated reason

One of the most powerful features of GraphQL is the auto-documentation of the schema. The GraphQL plugin allows you to add a description to a type, a field and a query. You can also deprecate a field or a query.

**Path —** `./api/restaurant/models/Restaurant.settings.json`.

```json
{
  "connection": "default",
  "info": {
    "description": "The Restaurant type description"
  },
  "options": {
    "timestamps": true
  },
  "attributes": {
    "name": {
      "type": "string",
      "description": "The name of the restaurant",
      "deprecated": "We are not using the name anymore, it is auto-generated thanks to our powerful AI"
    },
    "description": {
      "type": "text",
      "description": "The description of the restaurant."
    },
    "open": {
      "type": "boolean",
      "description": "Is the restaurant open or not. Yes = true."
    }
  }
}
```

It might happen that you want to add a description to a query or deprecate it. To do that, you need to use the `schema.graphql` file.

::: warning
The `schema.graphql` file has to be placed into the config folder of each API `./api/*/config/schema.graphql` or plugin `./extensions/*/config/schema.graphql`.
:::

**Path —** `./api/restaurant/config/schema.graphql`.

```js
module.exports = {
  resolver: {
    Query: {
      restaurants: {
        description: 'Return a list of restaurants', // Add a description to the query.
        deprecated:
          'This query should not be used anymore. Please consider using restaurantsByChef instead.', // Deprecate the query and explain the reason why.
      },
    },
    Mutation: {
      createRestaurant: {
        description: 'Create a new restaurant',
        deprecated: 'Please use the dashboard UI instead',
      },
    },
  },
};
```

### Execute a policy before a resolver

Sometimes a query needs to be only accessible to authenticated user. To handle this, Strapi provides a solid policy system. A policy is a function executed before the final action (the resolver). You can define an array of policy that will be executed in order.

```js
module.exports = {
  resolver: {
    Query: {
      restaurants: {
        description: 'Return a list of restaurants',
        policies: [
          'plugins::users-permissions.isAuthenticated',
          'isOwner', // will try to find the policy declared in the same api as this schema file.
          'application::otherapi.isMember',
          'global::logging',
        ],
      },
    },
    Mutation: {
      createRestaurant: {
        description: 'Create a new restaurant',
        policies: ['plugins::users-permissions.isAuthenticated', 'global::logging'],
      },
    },
  },
};
```

In this example, the policy `isAuthenticated` located in the `users-permissions` plugin will be executed first. Then, the `isOwner` policy located in the `Restaurant` API `./api/restaurant/config/policies/isOwner.js`. Next, it will execute the `logging` policy located in `./config/policies/logging.js`. Finally, the resolver will be executed.

::: tip
There is no custom resolver in that case, so it will execute the default resolver (Restaurant.find) provided by the Shadow CRUD feature.
:::

### Link a query or mutation to a controller action

By default, the plugin will execute the actions located in the controllers that has been generated via the Content-Type Builder plugin or the CLI. For example, the query `restaurants` is going to execute the logic inside the `find` action in the `Restaurant.js` controller. It might happen that you want to execute another action or a custom logic for one of your query.

```js
module.exports = {
  resolver: {
    Query: {
      restaurants: {
        description: 'Return a list of restaurants by chef',
        resolver: 'application::restaurant.restaurant.findByChef',
      },
    },
    Mutation: {
      createRestaurant: {
        description: 'Create a new restaurant',
        resolver: 'application::restaurant.restaurant.customCreate',
      },
    },
  },
};
```

In this example, it will execute the `findByChef` action of the `Restaurant` controller. It also means that the resolver will apply on the `restaurants` query the permissions defined on the `findByChef` action (through the administration panel).

::: tip
The `obj` parameter is available via `ctx.params` and the `options` are available via `ctx.query` in the controller's action.
:::

The same process is also applied for the `createRestaurant` mutation. It will execute the `customCreate` action of the `Restaurant` controller.

::: tip
The `where` parameter is available via `ctx.params` and the `data` are available via `ctx.request.body` in the controller's action.
:::

### Define a custom resolver

```js
module.exports = {
  resolver: {
    Query: {
      restaurants: {
        description: 'Return a list of restaurants by chef',
        resolver: (obj, options, { context }) => {
          // You can return a raw JSON object or a promise.

          return [{
            name: 'My first blog restaurant',
            description: 'Whatever you want...'
          }];
        }
      }
    },
    Mutation: {
      updateRestaurant: {
        description: 'Update an existing restaurant',
        resolver: (obj, options, { context }) => {
          // The `where` and `data` parameters passed as arguments
          // of the GraphQL mutation are available via the `context` object.
          const where = context.params;
          const data = context.request.body;

          return await strapi.api.restaurant.services.restaurant.addRestaurant(data, where);
        }
      }
    }
  }
};
```

You can also execute a custom logic like above. However, the roles and permissions layers won't work.

### Apply permissions on a query

It might happen that you want to apply our permissions layer on a query. That's why, we created the `resolverOf` attribute. This attribute defines which are the permissions that should be applied to this resolver. By targeting an action it means that you're able to edit permissions for this resolver directly from the administration panel.

```js
module.exports = {
  resolver: {
    Query: {
      restaurants: {
        description: 'Return a list of restaurants by chef',
        resolverOf: 'application::restaurant.restaurant.find', // Will apply the same policy on the custom resolver as the controller's action `find` located in `Restaurant.js`.
        resolver: (obj, options, context) => {
          // You can return a raw JSON object or a promise.

          return [{
            name: 'My first blog restaurant',
            description: 'Whatever you want...'
          }];
        }
      }
    },
    Mutation: {
      updateRestaurant: {
        description: 'Update an existing restaurant',
        resolverOf: 'application::restaurant.restaurant.update', // Will apply the same policy on the custom resolver than the controller's action `update` located in `Restaurant.js`.
        resolver: (obj, options, { context }) => {
          const where = context.params;
          const data = context.request.body;

          return await strapi.api.restaurant.services.restaurant.addRestaurant(data, where);
        }
      }
    }
  }
};
```

### Disable a query or a type

To do that, we need to use the `schema.graphql` like below:

```js
module.exports = {
  type: {
    Restaurant: false // The Restaurant type won't be "queriable" or "mutable".
  }
  resolver: {
    Query: {
      restaurants: false // The `restaurants` query will no longer be in the GraphQL schema.
    },
    Mutation: {
      createRestaurant: false,
      deletePOst: false
    }
  }
};
```

## FAQ

**How are the types name defined?**

The type name is the global ID of the model. You can find the global ID of a model like that `strapi.models[xxx].globalId` or `strapi.plugins[xxx].models[yyy].globalId`.

**Where should I put the field description and deprecated reason?**

We recommend putting the field description and deprecated reason in the model. Right now, the GraphQL plugin is the only which uses these fields. Another plugin could use this description in the future as well. However, sometimes you don't have the choice, especially when you're defining a custom type.

::: tip
It's not a bad practice to put the description and deprecated attribute in the `schema.graphql`, though.
:::

**Why are the "createdAt" and "updatedAt" field added to my type?**

The plugin detects if the `timestamps` option is set to `true` in the model. By default, when you generate an API this option is checked. Set it to `false` in your model to remove these fields.
