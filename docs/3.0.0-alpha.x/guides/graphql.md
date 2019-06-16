# GraphQL

::: warning
This feature requires the GraphQL plugin (not installed by default).
:::

## Usage

To get started with GraphQL in your app, please install the plugin first. To do that, open your terminal and run the following command:

```
strapi install graphql
```

Then, start your app and open your browser at [http://localhost:1337/graphql](http://localhost:1337/graphql). You should see the interface (GraphQL Playground) that will help you to write GraphQL query to explore your data.

::: note
Install the [ModHeader](https://chrome.google.com/webstore/detail/modheader/idgpnmonknjnojddfkpgkljpfnnfcklj/related) extension to set the `Authorization` header in your request
:::

## Configurations

By default, the [Shadow CRUD](#shadow-crud) feature is enabled and the GraphQL is set to `/graphql`. The Playground is enabled by default for both the development and staging environments, however it is disabled in production. By changing the config option `playgroundAlways` to true, you can enable it.

Security limits on maximum number of items in your response by default is limited to 100, however you can change this on the following config option `amountLimit`. This should only be changed after careful consideration of the drawbacks of a large query which can cause what would basically be a DDoS (Distributed Denial of Service). And may cause abnormal load on your Strapi server, as well as your database server.

You can also enable the Apollo server tracing feature, which is supported by the playground to track the response time of each part of your query. To enable this feature just change/add the `"tracing": true` option in the GraphQL settings file. You can read more about the tracing feature from Apollo [here](https://www.apollographql.com/docs/engine/features/query-tracing.html).

You can edit these configurations in the following files.

**Path —** `./plugins/graphql/config/settings.json`.

```
{
  "endpoint": "/graphql",
  "tracing": false,
  "shadowCRUD": true,
  "playgroundAlways": false,
  "depthLimit": 7,
  "amountLimit": 100
}
```

### Query API

In the section, we assume that the [Shadow CRUD](#shadow-crud) feature is enabled. For each model, the plugin auto-generates queries and mutations which just fit to your needs.

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

##### Create a new entry

- `input`: Object
  - `data`: Object — Values to insert

```
mutation {
  createUser(input: {
    data: {
      username: "John",
      email: "john@doe.com"
    }
  }) {
    user {
      username
      email
    }
  }
}
```

The implementation of the mutations also supports relational attributes. For example, you can create a new `User` and attach many `Post` to it by writing your query like this:

```
mutation {
  createUser(input: {
    data: {
      username: "John",
      email: "john@doe.com",
      posts: ["5b51e3949db573a586ad22de", "5b5b26619b0820c1c2fb79c9"]
    }
  }) {
    user {
      username
      email
      posts {
        title
        content
        publishedAt
      }
    }
  }
}
```

##### Update an existing entry

- `input`: Object
  - `where`: Object - Entry's ID to update
  - `data`: Object — Values to update

```
mutation {
  updateUser(input: {
    where: {
      id: "5b28f1747c739e4afb48605c"
    },
    data: {
      username: "John",
      email: "john@doe.com"
    }
  }) {
    user {
      username
      email
    }
  }
}
```

You can also update relational attributes by passing an ID or an array of IDs (depending of the relationship).

```
mutation {
  updatePost(input: {
    where: {
      id: "5b5b27f8164f75c29c728110"
    },
    data: {
      author: "5b51e3949db573a586ad22de" // User ID
    }
  }) {
    post {
      author {
        username
        email
      }
    }
  }
}
```

##### Delete an entry

- `input`: Object
  - `where`: Object - Entry's ID to delete

```
mutation {
  deleteUser(input: {
    where: {
      id: "5b28f1747c739e4afb48605c"
    }
  }) {
    user {
      username
      email
    }
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
  - `<field>_gte`: Greater than or equal to.
  - `<field>_contains`: Contains.
  - `<field>_containss`: Contains sensitive.
  - `<field>_in`: Matches any value in the array of values.
  - `<field>_nin`: Doesn't match any value in the array of values.

Return the second decade of users which have an email that contains `@strapi.io` ordered by username.

```
query {
  users(limit: 10, start: 10, sort: "username:asc", where: {
    email_contains: "@strapi.io"
  }) {
    username
    email
  },
  books(limit: 10, where: { _id_nin: ["5c4dad1a8f3845222ca88a56", "5c4dad1a8f3845222ca88a57"] }) {
    _id,
    title
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

To simplify and automate the build of the GraphQL schema, we introduced the Shadow CRUD feature. It automatically generates the type definition, queries, mutations and resolvers based on your models. The feature also lets you make complex query with many arguments such as `limit`, `sort`, `start` and `where`.

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
// Post's Type definition
type Post {
  _id: String
  created_at: String
  updated_at: String
  title: String
  content: String
  published: Boolean
}

// Queries to retrieve one or multiple posts.
type Query {
  posts(sort: String, limit: Int, start: Int, where: JSON): [Post]
  post(id: String!): Post
}

// Mutations to create, update or delete a post.
type Mutation {
  createPost(input: createPostInput): createPostPayload!
  updatePost(input: updatePostInput): updatePostPayload!
  deletePost(input: deletePostInput): deletePostPayload!
}
```

The queries and mutations will use the generated controller's actions as resolvers. It means that the `posts` query will execute the `Post.find` action, the `post` query will use the `Post.findOne` action and the `createProduct` mutation will use the `Post.create` action, etc.

## Aggregation & Grouping

::: warning
This feature is only available on Mongoose ORM.
:::

Strapi now supports Aggregation & Grouping.
Let's consider again the model mentioned above:

```
type Post {
  _id: ID
  createdAt: String
  updatedAt: String
  title: String
  content: String
  nb_likes: Int,
  published: Boolean
}
```

Strapi will generate automatically for you the following queries & types:

### Aggregation

```
type PostConnection {
  values: [Post]
  groupBy: PostGroupBy
  aggregate: PostAggregator
}

type PostGroupBy {
  _id: [PostConnection_id]
  createdAt: [PostConnectionCreatedAt]
  updatedAt: [PostConnectionUpdatedAt]
  title: [PostConnectionTitle]
  content: [PostConnectionContent]
  nb_likes: [PostConnectionNbLikes],
  published: [PostConnectionPublished]
}

type PostConnectionPublished {
  key: Boolean
  connection: PostConnection
}

type PostAggregator {
  count: Int
  sum: PostAggregatorSum
  avg: PostAggregatorAvg
  min: PostAggregatorMin
  max: PostAggregatorMax
}

type PostAggregatorAvg {
  nb_likes: Float
}

type PostAggregatorMin { // Same for max and sum
  nb_likes: Int
}

type Query {
  postsConnection(sort: String, limit: Int, start: Int, where: JSON): PostConnection
}
```

Getting the total count and the average likes of posts:

```
postsConnection {
  aggregate {
    count
    avg {
      nb_likes
    }
  }

}
```

Let's say we want to do the same query but for only published posts

```
postsConnection(where: { published: true }) {
  aggregate {
    count
    avg {
      nb_likes
    }
  }

}
```

Gettings the average likes of published and unpublished posts

```
postsConnection {
  groupBy {
    published: {
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
```

Result

```JSON
{
  data: {
    postsConnection: {
      groupBy: {
        published: [
          {
            key: true,
            connection: {
              aggregate: {
                avg {
                  nb_likes: 10
                }
              }
            }
          },
          {
            key: false,
            connection: {
              aggregate: {
                avg {
                  nb_likes: 0
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

If you want to define a new scalar, input or enum types, this section is for you. To do so, you will have to create a `schema.graphql` file. This file has to be placed into the config folder of each API `./api/*/config/schema.graphql` or plugin `./plugins/*/config/schema.graphql`.

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

- `definition` (string): let's you define new type, input, etc.
- `query` (string): where you add custom query.
- `mutation` (string): where you add custom mutation.
- `type` (object): allows you to add description, deprecated field or disable the [Shadow CRUD](#shadow-crud) feature on a specific type.
- `resolver` (object):
  - `Query` (object): let's you define custom resolver, policies for a query.
  - `Mutation` (object): let's you define custom resolver, policies for a mutation.

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
    postsByAuthor(id: ID, status: PostStatusInput, limit: Int): [Post]!
  `,
  mutation: `
    attachPostToAuthor(id: ID, authorID: ID): Post!
  `
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
    },
    Mutation: {
      attachPostToAuthor: {
        description: 'Attach a post to an author',
        policy: ['plugins.users-permissions.isAuthenticated', 'isOwner'],
        resolver: 'Post.attachToAuthor'
      }
    }
  }
};
```

### Define a new type

Edit the `definition` attribute in one of the `schema.graphql` files of your project by using the GraphQL Type language string.

::: note
The easiest way is to create a new model using the CLI `strapi generate:model category --api post`, so you don't need to customise anything.
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
        resolver: 'Person.findOne' // It will use the action `findOne` located in the `Person.js` controller*.
      }
    }
  }
};
```

::: note
The resolver parameter also accepts an object as a value to target a controller located in a plugin.
:::

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

::: warning
The `schema.graphql` file has to be placed into the config folder of each API `./api/*/config/schema.graphql` or plugin `./plugins/*/config/schema.graphql`.
:::

**Path —** `./api/post/config/schema.graphql`.

```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts', // Add a description to the query.
        deprecated:
          'This query should not be used anymore. Please consider using postsByAuthor instead.', // Deprecate the query and explain the reason why.
      },
    },
    Mutation: {
      createPost: {
        description: 'Create a new post',
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
      posts: {
        description: 'Return a list of posts',
        policy: [
          'plugins.users-permissions.isAuthenticated',
          'isOwner',
          'global.logging',
        ],
      },
    },
    Mutation: {
      createPost: {
        description: 'Create a new post',
        policy: ['plugins.users-permissions.isAuthenticated', 'global.logging'],
      },
    },
  },
};
```

In this example, the policy `isAuthenticated` located in `./plugins/users-permissions/config/policies/isAuthenticated.js` will be executed first. Then, the `isOwner` policy located in the `Post` API `./api/post/config/policies/isOwner.js`. Next, it will execute the `logging` policy located in `./config/policies/logging.js`. Finally, the resolver will be executed.


::: note
There is no custom resolver in that case, so it will execute the default resolver (Post.find) provided by the Shadow CRUD feature.
:::

### Link a query or mutation to a controller action

By default, the plugin will execute the actions located in the controllers that has been generated via the Content-Type Builder plugin or the CLI. For example, the query `posts` is going to execute the logic inside the `find` action in the `Post.js` controller. It might happens that you want to execute another action or a custom logic for one of your query.

```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts by author',
        resolver: 'Post.findByAuthor',
      },
    },
    Mutation: {
      createPost: {
        description: 'Create a new post',
        resolver: 'Post.customCreate',
      },
    },
  },
};
```

In this example, it will execute the `findByAuthor` action of the `Post` controller. It also means that the resolver will apply on the `posts` query the permissions defined on the `findByAuthor` action (through the administration panel).

::: note
The `obj` parameter is available via `ctx.params` and the `options` are available via `ctx.query` in the controller's action.
:::

The same process is also applied for the `createPost` mutation. It will execute the `customCreate` action of the `Post` controller.

::: note
The `where` parameter is available via `ctx.params` and the `data` are available via `ctx.request.body` in the controller's action.
:::

### Define a custom resolver

```js
module.exports = {
  resolver: {
    Query: {
      posts: {
        description: 'Return a list of posts by author',
        resolver: (obj, options, { context }) => {
          // You can return a raw JSON object or a promise.

          return [{
            title: 'My first blog post',
            content: 'Whatever you want...'
          }];
        }
      }
    },
    Mutation: {
      updatePost: {
        description: 'Update an existing post',
        resolver: (obj, options, { context }) => {
          // The `where` and `data` parameters passed as arguments
          // of the GraphQL mutation are available via the `context` object.
          const where = context.params;
          const data = context.request.body;

          return await strapi.api.post.services.post.addPost(data, where);
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
    },
    Mutation: {
      updatePost: {
        description: 'Update an existing post',
        resolverOf: 'Post.update', // Will apply the same policy on the custom resolver than the controller's action `update` located in `Post.js`.
        resolver: (obj, options, { context }) => {
          const where = context.params;
          const data = context.request.body;

          return await strapi.api.post.services.post.addPost(data, where);
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
    Post: false // The Post type won't be "queriable" or "mutable".
  }
  resolver: {
    Query: {
      posts: false // The `posts` query will no longer be in the GraphQL schema.
    },
    Mutation: {
      createPost: false,
      deletePOst: false
    }
  }
};
```

## FAQ

**How are the types name defined?**

The type name is the global ID of the model. You can find the global ID of a model like that `strapi.models[xxx].globalId` or `strapi.plugins[xxx].models[yyy].globalId`.

**Where should I put the field description and deprecated reason?**

We recommend to put the field description and deprecated reason in the model. Right now, the GraphQL plugin is the only which uses these fields. Another plugin could use this description in the future as well. However, sometimes you don't have the choice, especially when you're defining a custom type.

::: note
It's not a bad practice to put the description and deprecated attribute in the `schema.graphql`, though.
:::

**Why are the "createdAt" and "updatedAt" field added to my type?**

The plugin detects if the `timestamps` option is set to `true` in the model. By default, when you generate an API this option is checked. Set it to `false` in your model to remove these fields.
