# Policies

Policies in Strapi are versatile tools for authorization and access control-- they let you allow or deny access to your controllers down to a fine level of granularity. For example, if you were building Dropbox, before letting a user upload a file to a folder, you might check that she `isAuthenticated`, then ensure that she `canWrite` (has write permissions on the folder.) Finally, you'd want to check that the folder she's uploading into `hasEnoughSpace`.

Policies can be used for anything: HTTP BasicAuth, 3rd party single-sign-on, OAuth 2.0,
or your own custom authorization/authentication scheme.

## Policies and route process

Just because a request matches a route address doesn't necessarily mean it will be passed to that route's target directly. The request will need to pass through any configured policies first. Policies are versatile tools for authorization and access control. They let you allow or deny access to your controllers down to a fine level of granularity.

```js
{
  "routes": {
    "DELETE /post/:id": {
      "controller": "Post",
      "action": "delete",
      "policies": ["isAdmin"]
    }
  }
}
```

## Writing your first policy

Policies are defined in the `policies` directory of every API.

Each policy file should contain a single function. When it comes down to it, policies are really just functions which run before your controllers. You can chain as many of them together as you like. In fact they're designed to be used this way. Ideally, each middleware function should really check just one thing.

For example you can generate a policy named `isAuthenticated` for the `user` API using the CLI:

```bash
$ strapi generate:policy isAuthenticated user
```

!!! important
    Do not forget to yield `next` when you need to move on.
