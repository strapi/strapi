# GraphQL

GraphQL is a data querying language that allows you to execute complex nested
requests between your clients and server applications.

## Configuration

By default, GraphQL is enabled and the HTTP endpoint is `/graphql`.
You can override this settings in the `./config/general.json` file.

```js
{
  "graphql": {
    "enabled": true,
    "route": "/graphql"
  }
}
```

Options:
- `enabled` (boolean): Enabled or disabled GraphQL.
- `route` (string): Change GraphQL endpoint.

Note: If GraphQL is disabled, the GraphQL global variable is not exposed.

## Execute simple query

### Programmatically

Strapi takes over GraphQL natively. We added a function called `query` to execute
your query without given as a parameters the GraphQL schemas each time.

An example of how to use `query` function:
```js
// Build your query
const query = '{ users{firstName lastName posts{title}} }';

// Execute the query
graphql.query(query)
  .then(function (result) {
    console.log(result);
  })
  .catch(function (error) {
    console.log(error);
  });
```

And the JSON result:

```js
{
  "users": [{
    "firstname": "John",
    "lastname": "Doe",
    "posts":[{
      "title": "First title..."
    }, {
      "title": "Second title..."
    }, {
      "title": "Third title..."
    }]    
  }, {
    "firstname": "Karl",
    "lastname": "Doe",
    "posts":[{
      "title": "Fourth title..."
    }]    
  }]
}
```

### With a HTTP request

Strapi also provides a HTTP GraphQL server to execute request from your front-end application.

An example of how to execute the same request as above with a HTTP request with jQuery.

```js
$.get('http://yourserver.com/graphql?query={ users{firstName lastName posts{title}} }', function (data) {
  console.log(data);
});
```

## Execute complex queries

### Query parameters

If you're using Waterline ORM installed by default with Strapi, you have access to
some Waterline query parameters in your GraphQL query such as `sort`, `limit` or `skip`.
Strapi also provides the `start` and `end` parameters to select records between two dates.

This example will return 10 users' records sorted alphabetically by `firstName`:

```js
const query = '{ users(limit: 10, sort: "firstName ASC"){firstName lastName post{title}} }';
```

You can access to the 10 next users by adding the `skip` parameter:

```js
const query = '{ users(limit: 10, sort: "firstName ASC", skip: 10){firstName lastName posts{title}} }';
```

And you also can select those records in a period between two dates with the `start` and `end` parameters:

```js
const query = '{ users(limit: 10, sort: "firstName ASC", skip: 10, start: "09/21/2015", end:" 09/22/2015"){firstName lastName posts{title}} }';
```

### Useful functions

Strapi comes with a powerful set of useful functions such as `getLatest<Model>`, `getFirst<Model>` and `count<Model>`.

Returns the 5 latest users from the September 27th 2015 at 8:59:59 PM:

```js
const query = '{ getLatestUsers(count: 5, start: "9/27/2015 20:59:59"){firstName lastName posts{title}} }';
```

Returns the 5 first users:

```js
const query = '{ getFirstUsers(count: 5){firstName lastName posts{title}} }';
```

Returns the number of subscribers the September 28th 2015:

```js
const query = '{ countUsers(start: "9/28/2015", end: "9/28/2015") }';
```
