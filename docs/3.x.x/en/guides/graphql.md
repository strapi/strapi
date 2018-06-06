# GraphQL

> ⚠️  This feature requires the GraphQL plugin (not installed by default).

## Usage

To get started with GraphQL in your app, please install the plugin first. To do that, open your terminal and run the following command:

```
strapi install graphql
```

Then, start your app and open your browser at [http://localhost:1337/playground](http://localhost:1337/playground). You should see the interface (GraphQL Playground) that will help you to write GraphQL query to explore your data.

> Install the [ModHeader](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj/related) extension to set the `Authorization` header in your request

## Configurations

By default, the [Shadow CRUD](#shadow-crud) feature is enabled and the GraphQL is set to `/graphql`. You can edit these configurations in the following files.

**Path —** `./plugins/graphql/config/settings.json`.
```
{
  "endpoint": "/graphql",
  "shadowCRUD": true,
  "depthLimit": 7
}
```

### Query API

In the section, we assume that the [Shadow CRUD](#shadow-crud) feature is enabled. For each model, the plugin auto-generates queries which just fit to your needs.

##### Fetch a single entry

- `id`: String

```
query {
  user(id: "5aafe871ad624b7380d7a224") {
    username
    email
  }
}
```

##### Fetch multiple entries

```
query {
  users {
    username
    email
  }
}
```

**Filters**

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
  - `<field>_gte`: Lower than or equal to.
  - `<field>_contains`: Contains.
  - `<field>_containss`: Contains sensitive.

Return the second decade of users which have an email that contains `@strapi.io` ordered by username.
```
query {
  users(limit: 10, start: 10, sort: "username:asc", where: {
    email_contains: "@strapi.io"
  }) {
    username
    email
  }
}
```

Return the users which have been created after the March, 19th 2018 4:21 pm.
```
query {
  users(where: {
    createdAt_gt: "2018-03-19 16:21:07.161Z"
  }) {
    username
    email
  }
}
```


## Shadow CRUD

To simplify and automate the build of the GraphQL schema, we introduced the Shadow CRUD feature. It automatically generates the type definition, queries and resolvers based on your models. The feature also lets you make complex query with many arguments such as `limit`, `sort`, `start` and `where`.


#### Example

If you've generated an API called `Post` using the CLI `strapi generate:api post` or the administration panel, your model looks like this:

**Path —** `./api/post/models/Post.settings.json`.
```
{
  "connection": "default",
  "options": {
    "timestamps": true
  },
  "attributes": {
    "title": {
      "type": "string"
    }
    "content": {
      "type": "text"
    },
    "published": {
      "type": "boolean"
    }
  }
}
```

The generated GraphQL type and queries will be:
```
type Post {
  _id: String
  created_at: String
  updated_at: String
  title: String
  content: String
  published: Boolean
}

type Query {
  posts(sort: String, limit: Int, start: Int, where: JSON): [Post]
  post(id: String!): Post
}
```

The query will use the generated controller's actions as resolvers. It means that the `posts` query will execute the `Post.find` action and the `post` query will use the `Post.findOne` action.

## Customise the GraphQL schema

If you want to define a new scalar, input or enum types, this section is for you. To do so, you will have to create a `schema.graphql` file. This file has to be placed into the config folder of each API `./api/*/config/schema.graphql` or plugin `./plugins/*/config/schema.graphql`.

**Structure —** `schema.graphql`.
```js
module.exports = {
  definition: ``,
  query: ``,
  type: {},
  resolver: {
    Query: {}
  }
};
```

- `definition` (string): let's you define new type, input, etc.
- `query` (string): where you add custom query.
- `type` (object): allows you to add description, deprecated field or disable the [Shadow CRUD](#shadow-crud) feature on a specific type.
- `resolver` (object):
  - `Query` (object): let's you define custom resolver, policies for a query.


#### Example

Let say we are using the same previous `Post` model.

**Path —** `./api/post/config/schema.graphql`.
```js
module.exports = {
  definition: `
    enum PostStatusInput {
      draft
      reviewing
      reviewed
      published
      deleted
    }
  `,
  query: `
    postsByAuthor(id: String, status: PostStatusInput, limit: Int): [Post]!
  `,
  resolver: {
    Query: {
      post: {
        description: 'Return a single post',
        policy: ['plugins.users-permissions.isAuthenticated', 'isOwner'], // Apply the 'isAuthenticated' policy of the `Users & Permissions` plugin, then the 'isOwner' policy before executing the resolver.
      },
      posts: {
        description: 'Return a list of posts', // Add a description to the query.
        deprecated: 'This query should not be used anymore. Please consider using postsByAuthor instead.'
      },
      postsByAuthor: {
        description: 'Return the posts published by the author',
        resolver: 'Post.findByAuthor'
      },
      postsByTags: {
        description: 'Return the posts published by the author',
        resolverOf: 'Post.findByTags', // Will apply the same policy on the custom resolver than the controller's action `findByTags`.
        resolver: (obj, options, ctx) => {
          // ctx is the context of the Koa request.
          await strapi.controllers.posts.findByTags(ctx);

          return ctx.body.posts || `There is no post.`;
        }
      }
    }
  }
};
```

### Define a new type

Edit the `definition` attribute in one of the `schema.graphql` files of your project by using the GraphQL Type language string.

> Note: The easiest way is to create a new model using the CLI `strapi generate:model category --api post`, so you don't need to customise anything.

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
  `
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
        resolver: 'Person.findOne' // It will use the action `findOne` located in the `Person.js` controller*.
      }
    }
  }
};
```

>The resolver parameter also accepts an object as a value to target a controller located in a plugin.

```js
module.exports = {
  ...
  resolver: {
    Query: {
      person: {
        description: 'Return a single person',
        resolver: {
          plugin: 'users-permissions',
          handler: 'User.findOne' // It will use the action `findOne` located in the `Person.js` controller inside the plugin `Users & Permissions`.
        }
      }
    }
  }
};
```

### Add description and deprecated reason

One of the most powerful features of GraphQL is the auto-documentation of the schema. The GraphQL plugin allows you to add a description to a type, a field and a query. You can also deprecate a field or a query.

**Path —** `./api/post/models/Post.settings.json`.
```
{
  "connection": "default",
  "info": {
    "description": "The Post type description"
  },
  "options": {
    "timestamps": true
  },
  "attributes": {
    "title": {
      "type": "string",
      "description": "The title of the post",
      "deprecated": "We are not using the title anymore, it is auto-generated thanks to our powerful AI"
    },
    "content": {
      "type": "text",
      "description": "The content of the post."
    },
    "published": {
      "type": "boolean",
      "description": "Is the post published or not. Yes = true."
    }
  }
}
```

It might happens that you want to add a description to a query or deprecate it. To do that, you need to use the `schema.graphql` file.

> Remember: The `schema.graphql` file has to be placed into the config folder of each API `./api/*/config/schema.graphql` or plugin `./plugins/*/config/schema.graphql`.

**Path —** `./api/post/config/schema.graphql`.
```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts', // Add a description to the query.
        deprecated: 'This query should not be used anymore. Please consider using postsByAuthor instead.' // Deprecate the query and explain the reason why.
      }
    }
  }
};
```

### Execute a policy before a resolver

Sometimes a query needs to be only accessible to authenticated user. To handle this, Strapi provides a solid policy system. A policy is a function executed before the final action (the resolver). You can define an array of policy that will be executed in order.

```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts',
        policy: ['plugins.users-permissions.isAuthenticated', 'isOwner', 'global.logging']
      }
    }
  }
};
```

In this example, the policy `isAuthenticated` located in `./plugins/users-permissions/config/policies/isAuthenticated.js` will be executed first. Then, the `isOwner` policy located in the `Post` API `./api/post/config/policies/isOwner.js`. Next, it will execute the `logging` policy located in `./config/policies/logging.js`. Finally, the resolver will be executed.

> Note: There is no custom resolver in that case, so it will execute the default resolver (Post.find) provided by the Shadow CRUD feature.

### Link a query to a controller action

By default, the plugin will execute the actions located in the controllers that has been generated via the Content-Type Builder plugin or the CLI. For example, the query `posts` is going to execute the logic inside the `find` action in the `Post.js` controller. It might happens that you want to execute another action or a custom logic for one of your query.

```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts by author',
        resolver: 'Post.findByAuthor'
      }
    }
  }
};
```

In this example, it will execute the `findByAuthor` action of the `Post` controller. It also means that the resolver will apply on the `posts` query the permissions defined on the `findByAuthor` action (through the administration panel).

> Note: The `obj` parameter is available via `ctx.params` and the `options` are available via `ctx.query` in the controller's action.

### Define a custom resolver

```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts by author',
        resolver: (obj, options, context) => {
          // You can return a raw JSON object or a promise.

          return [{
            title: 'My first blog post',
            content: 'Whatever you want...'
          }];
        }
      }
    }
  }
};
```

You can also execute a custom logic like above. However, the roles and permissions layers won't work.

### Apply permissions on a query

It might happens that you want apply our permissions layer on a query. That's why, we created the `resolverOf` attribute. This attribute defines which are the permissions that should be applied to this resolver. By targeting an action it means that you're able to edit permissions for this resolver directly from the administration panel.

```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts by author',
        resolverOf: 'Post.find', // Will apply the same policy on the custom resolver than the controller's action `find` located in `Post.js`.
        resolver: (obj, options, context) => {
          // You can return a raw JSON object or a promise.

          return [{
            title: 'My first blog post',
            content: 'Whatever you want...'
          }];
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
    Post: false // The Post type won't be "queriable".
  }
  resolver: {
    Query: {
      posts: false // The `posts` query will no longer be in the GraphQL schema.
    }
  }
};
```

## FAQ

**How are the types name defined?**

The type name is the global ID of the model. You can find the global ID of a model like that `strapi.models[xxx].globalId` or `strapi.plugins[xxx].models[yyy].globalId`.

**Where should I put the field description and deprecated reason?**

We recommend to put the field description and deprecated reason in the model. Right now, the GraphQL plugin is the only which uses these fields. Another plugin could use this description in the future as well. However, sometimes you don't have the choice, especially when you're defining a custom type.

> Note: It's not a bad practice to put the description and deprecated attribute in the `schema.graphql`, though.

**Why are the "createdAt" and "updatedAt" field added to my type?**

The plugin detects if the `timestamps` option is set to `true` in the model. By default, when you generate an API this option is checked. Set it to `false` in your model to remove these fields.
