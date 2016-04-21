# GraphQL

Strapi build your GraphQL schema based on your model definitions. By default, you can make queries to the GraphQL server at [http://localhost:1337/graphql](http://locahost:1337/graphql).

## Configuration

Configuration:

- Key: `graphql`
- Environment: all
- Location: `./config/general.json`
- Type: `object`

Example:

```js
{
  "graphql": {
    "route": "/graphql",
    "enabled": true,
    "graphiql": true,
    "pretty": true,
    "usefulQueries": true
  }
}
```

Options:

- `route` (string): The default locale to use.
- `enabled` (boolean): Enabled or disabled GraphQL.
- `graphiql` (boolean): Enabled or disabled GraphiQL, the graphical interactive in-browser GraphQL IDE developed by Facebook. The UI is accessible at [http://localhost:1337/graphql](http://locahost:1337/graphql) in your browser.
- `pretty` (boolean): JSON response will be pretty-printed.
- `usefulQueries` (boolean): Enabled or disabled useful GraphQL queries. This configuration enables some useful queries for GraphQL. For example, if you have an API called `User`, you will be allowed to access to new queries such as `getLatestUsers`, `getFirstUsers` and `countUsers`. In the near future, we will add a `start` and `end` parameter in the query to filters results between two dates.

## Queries

We recommend you to use `GET` requests to query your GraphQL server. By default, you can make a query to the GraphQL server at `http://localhost:1337/graphql?query={...}`.

### Get latest records

- Query: `getLatest[Model]s *(count: Int!)*`

For example, this will return the five latest users:

```js
{
  getLatestUsers(count: 5)
}
```

### Get first records

- Query: `getFirst[Model]s *(count: Int!)*`

For example, this will return the eight first users:

```js
{
  getFirstUsers(count: 8)
}
```

### Get count of records

- Query: `count[Model]`

For example, this will return the numbers of users:

```js
{
  countUsers
}
```

## Mutations

The GraphQL implementation comes with basics mutations. This allows you to create, update or delete a record in your database.

We recommend you to use `POST` requests to query your GraphQL server for mutations. By default, you make a query to the GraphQL server at `http://localhost:1337/graphql?query={...}`. To send your data, you have to put them in your `POST` body request.

### Create a record

- Mutation: `create[Model]`

For example, this will create a new user:

```js
{
  mutation {
    createUser {
      id
      firstname
      lastname
    }
  }
}
```

In our request `POST` body, we have to send a JSON object:

```js
{
  "firstname": "John",
  "lastname": "Doe",
  "age": "20",
  "address": "Sky.."
}
```

### Update a record

- Mutation: `update[Model] *(id: String!)*`

For example, this will update an existing user with the `id` `1`:

```js
{
  mutation {
    updateUser(id:"1") {
      id
      firstname
      lastname
    }
  }
}
```

... in our request POST body, we have to sent this JSON object:

```js
{
  "lastname": "Doe Junior",
}
```

!!! important
    Don't forget to send the ID in the body!

### Delete a record

- Mutation: `delete[Model] *(id: String!)*`

For example, this will delete the user with the `id` `1`:

```js
{
  mutation {
    deleteUser(id:"1") {
      id
    }
  }
}
```

!!! note
    You have to specify field in your query. However the value will be `null`.

## Permissions

Strapi allows you to apply policies on each query or mutation. During boot, Strapi will write (or rewrite) a configuration file called `graphql.json` in each API folder.

For example, the file looks like this in the `/api/article/config/` folder:

```js
{
  "query": {
    "article": [],
    "articles": [],
    "getLatestArticles": [],
    "getFirstArticles": [],
    "countArticles": []
  },
  "mutation": {
    "createArticle": [],
    "updateArticle": [],
    "deleteArticle": []
  }
}
```

Then, you can apply one or more policies on each query and mutation.

```js
{
  "query": {
    "article": ["isConnected", "isOwner"],
    "articles": ["isConnected"],
    "getLatestArticles": ["isConnected"],
    "getFirstArticles": ["isConnected"],
    "countArticles": ["isConnected"]
  },
  "mutation": {
    "createArticle": ["isAuthorized", "isConnected"],
    "updateArticle": ["isAuthorized", "isConnected", "isOwner"],
    "deleteArticle": ["isAuthorized", "isConnected", "isOwner"]
  }
}
```

## Use GraphQL in your codebase

You can make GraphQL query in your codebase. The `graphql` is exposed in global, and Strapi add a new function called `query` to easily make GraphQL query.

```javascript
this.body = yield graphql.query("{articles{title}}", this);
// Don't forget to send the context. This is needed to apply permissions.
```

!!! note
    The policy doesn't need to be in the same API folder. The GraphQL permissions are based on the global `strapi.policies` variable which is an aggregate of the policies of the whole application. Also, the request is apply to the policies, in others words, this means you can handle sessions and cookies in the policy as usual.
