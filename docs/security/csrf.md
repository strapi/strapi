---
title: CSRF
---

Cross Site Request Forgery (CSRF) is a type of attack which forces an end user to execute unwanted actions on a web application backend with which he/she is currently authenticated.

Strapi bundles optional CSRF protection out of the box.

## Configuration

Configuration:

- Key: `csrf`
- Environment: `development`
- Location: `./config/environments/development/security.json`
- Type: `object`

```js
{
  "csrf": {
    "key": "_csrf",
    "secret": "_csrfSecret"
  }
}
```

Options:

- `key` (string): The name of the CSRF token added to the model. Defaults to `_csrf`.
- `secret` (string): The key to place on the session object which maps to the server side token. Defaults to `_csrfSecret`.

Notes:

- Set to `false` to disable CSRF headers.
- If you have existing code that communicates with your Strapi backend via `POST`, `PUT`, or `DELETE` requests, you'll need to acquire a CSRF token and include it as a parameter or header in those requests.
