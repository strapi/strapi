# JSON API

Strapi comes with a strong implementation of the JSON API specification. With its shared conventions, you can increase productivity, take advantage of generalized tooling, and focus on what matters: your application. Moreover, clients built around JSON API are able to take advantage of its features around efficiently caching responses, sometimes eliminating network requests entirely.

## Configuration

Configuration:

- Key: `jsonapi`
- Environment: all
- Location: `./config/general.json`
- Type: `object`

Example:

```js
{
  "jsonapi": {
    "enabled": true,
    "ignoreRelationshipData": true,
    "includedRelationshipData": true,
    "included": true,
    "paginate": 2,
    "showVersion": true,
    "keyForAttribute": "snake_case"
  }
}
```

Options:

- `enabled` (boolean): Enabled or disabled the JSON API implementation.
- `ignoreRelationshipData` (boolean): Do not include the data key inside the relationship.
- `includedRelationshipData` (boolean): Consider the relationships as compound document.
- `paginate` (integer): Number of records returned per page, when the pagination parameter is detected in the URL.
- `showVersion` (boolean): Indicating the highest JSON API version supported in the response.
- `keyForAttribute` (string): Change JSON response key format. Available values:
  - `dash-case` (ex: `created-at`) *(recommended)*
  - `lisp-case` (ex: `created-at`)
  - `spinal-case` (ex: `created-at`)
  - `kebab-case` (ex: `created-at`)
  - `underscore_case`(ex: `created_at`)
  - `snake_case` (ex: `created_at`)
  - `camelCase` (ex: `createdAt`)
  - `CamelCase`(ex: `createdAt`)

Notes:

- If you generate an API via the CLI when JSON API is enabled, the generated API will be compatible with JSON API. The API will follow the recommendations (see below).

## Recommendations

The Strapi implementation of JSON API is following the [official recommendations](http://jsonapi.org/recommendations/) for JSON API. To avoid issue or weird behavior with the JSON API implementation, we strongly recommend to follow the guidelines and routes below.

### Guidelines

- Use singular model name (ex: `User` instead of `Users`).
- Use routes format recommendations (see below).
- Use only official ORMs supported by Strapi.
- Don't override Strapi context or request variable.
- Don't forget to send the `application/vnd.api+json` Content-Type header on each request.
- Content-Type header value should be only `application/vnd.api+json` and not an aggregation of multiple values such as `application/vnd.api+json; application/json`.
- Some clients, like IE8, lack support for HTTP's `PATCH` method. These clients are recommended to treat `POST` requests as `PATCH` requests if the client includes the `X-HTTP-Method-Override: PATCH` header.

### Routes

For example, if you have an API called `Article`, your `/api/article/config/routes.json` file should be like this:

```js
{
  "routes": {
    "GET /article": {
      "controller": "Article",
      "action": "find"
    },
    "GET /article/:id": {
      "controller": "Article",
      "action": "findOne"
    },
    "GET /article/:id/relationships/:relation": {
      "controller": "Article",
      "action": "findOne"
    },
    "GET /article/:id/:relation": {
      "controller": "Article",
      "action": "findOne"
    },
    "POST /article": {
      "controller": "Article",
      "action": "create"
    },
    "PATCH /article/:id": {
      "controller": "Article",
      "action": "update"
    },
    "PATCH /article/:id/relationships/:relation": {
      "controller": "Article",
      "action": "update"
    },
    "DELETE /article/:id": {
      "controller": "Article",
      "action": "destroy"
    },
    "POST /article/:id/relationships/:relation": {
      "controller": "Article",
      "action": "createRelation"
    },
    "DELETE /article/:id/relationships/:relation": {
      "controller": "Article",
      "action": "destroyRelation"
    }
  }
}
```

## Pagination

The Strapi implementation of JSON API is following a *page-based strategy* for pagination. To use it, you can request the server at `http://localhost:1337/article?page[number]=15`. The `page[number]` value must be an `integer`.
