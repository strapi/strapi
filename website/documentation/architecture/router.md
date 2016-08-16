# Router

The most basic feature of any web application is the ability to interpret a request sent to a URL, then send back a response. In order to do this, your application has to be able to distinguish one URL from another.

Like most web frameworks, Strapi provides a router: a mechanism for mapping URLs to controllers. Routes are rules that tell Strapi what to do when faced with an incoming request.

For every API, routes can be found in `./api/apiName/config/routes.json`.

## Route format

Each route consists of an address (as a key) and a target (as an object value). The address is a URL path and a specific HTTP method. The target is defined by an object with a `controller` and an `action`. When the router receives an incoming request, it checks the address of all routes for matches. If a matching route is found, the request is then passed to its target.

The schema for a route is:

```js
{
  "routes": {
    "VERB /endpoint/:param": {
      "controller": "controllerName",
      "action": "actionName"
    }
  }
}
```

For example to manage your `Post` records with a CRUD, your route should look like this:

```js
{
  "routes": {
    "GET /post": {
      "controller": "Post",
      "action": "find"
    }
    "GET /post/:id": {
      "controller": "Post",
      "action": "findOne"
    },
    "POST /post": {
      "controller": "Post",
      "action": "create"
    },
    "PUT /post/:id": {
      "controller": "Post",
      "action": "update"
    },
    "DELETE /post/:id": {
      "controller": "Post",
      "action": "delete"
    }
  }
}
```

## Route parameters

Route paths will be translated to regular expressions used to match requests. Query strings will not be considered when matching requests.

Route parameters are captured and added to `ctx.params` or `ctx.request.body`.

## Router prefix

Prefix your API aiming to not have any conflicts with your front-end if you have one of if need to for some other reasons.

Configuration:

- Key: `prefix`
- Environment: all
- Location: `./config/general.json`
- Type: `string`

Example:

```js
{
  "prefix": "/api"
}
```

Notes:

- Let an empty string if you don't want to prefix your API.
- The prefix must starts with a `/`.
