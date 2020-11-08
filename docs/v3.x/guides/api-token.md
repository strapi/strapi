# API tokens

In this guide we will see how you can create an API token system to execute request as an authenticated user.

This feature is in our [roadmap](https://portal.productboard.com/strapi/1-public-roadmap/c/40-api-access-token-with-permissions).
This guide is a workaround to achieve this feature before we support it natively in strapi.

## Introduction

The goal is to be able to request API endpoints with a query parameter `token` that authenticates as a user. `eg. /restaurants?token=my-secret-token`.

To achieve this feature in development, we will have to customize the `users-permissions` plugin. To do so we will use the [customization concept](../concepts/customization.md), this documentation will help you understand how to customize all your applications

## Create the Token Content Type

To manage your tokens, you will have to create a new Content Type named `token`.

- `string` attribute named `token`
- `relation` attribute **Token** (`user`) - **Token** has and belongs to one **User** - **User** (`token`)

Then add some users and create some token linked to these users.

## Setup the file to override

We now have to customize the function that verifies the `token` token. Strapi has an Authentication process that uses `JWT` tokens, we will reuse this function to customize the verification.

[Here is the function](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-users-permissions/config/policies/permissions.js) that manages the JWT validation.

To be able to customize it, you will have to create a new file in your application `./extensions/users-permissions/config/policies/permissions.js`.

Then copy the original function that is on GitHub and paste it in your new file.

When it's done, the Strapi application will use this function instead of the core one. We are ready to customize it.

## Add token validation logic

You will have to update the first lines of this function.

**Path —** `./extensions/users-permissions/config/policies/permissions.js`

```js
const _ = require('lodash');

module.exports = async (ctx, next) => {
  let role;

 if (ctx.state.user) {
    // request is already authenticated in a different way
    return next();
  }

  // add the detection of `token` query parameter
  if (
    (ctx.request && ctx.request.header && ctx.request.header.authorization) ||
    (ctx.request.query && ctx.request.query.token)
    ) {
    try {
      // init `id` and `isAdmin` outside of validation blocks
      let id;
      let isAdmin;

      if (ctx.request.query && ctx.request.query.token) {
        // find the token entry that match the token from the request
        const [token] = await strapi.query('token').find({token: ctx.request.query.token});

        if (!token) {
          throw new Error(`Invalid token: This token doesn't exist`);
        } else {
          if (token.user && typeof token.token === 'string') {
            id = token.user.id;
          }
          isAdmin = false;
        }

        delete ctx.request.query.token;
      } else if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
        // use the current system with JWT in the header
        const decrypted = await strapi.plugins[
          'users-permissions'
        ].services.jwt.getToken(ctx);

        id = decrypted.id;
        isAdmin = decrypted.isAdmin || false;
      }

      // this is the line that already exist in the code
      if (id === undefined) {
        throw new Error('Invalid token: Token did not contain required fields');
      }

      ...
```

And tada! You can now create a token, link it to a user and use it in your URLs with `token` as query parameters.
