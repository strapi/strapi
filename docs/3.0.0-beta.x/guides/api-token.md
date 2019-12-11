# API tokens

In this guide we will see how you can create an API token system to execute request as an authenticated user.

This feature is in our [backlog there](https://portal.productboard.com/strapi/1-public-roadmap/c/40-api-access-token-with-permissions).
So this guide is about customization, to help you to have this feature. It will be no longer useful when we will release the feature.

## Introduction

The objective is to be able to request your API endpoints by using a query parameters `token` and be authenticated as a user. eg. `/restaurants?token=my-secret-token`.

To achive this feature development, we will have to customize the `users-permissions` plugin. To do so we will use the [customization concept](../concepts/customization.md), this documentation will help you to understand how to customize all your application.

## Create the Token Content Type

To manage your tokens, you will have to create a new Content Type named `token`.

- `string` attribute named `token`
- `relation` attribute **Token** (`user`) - **Token**  has and belongs to one **User** - **User** (`token`)

Then add some users and create some token linked to these users.

## Setup the file to override

We now have to customize the function that verify the `JWT`. Strapi has an Authentification process that use JWT, we will use this function to add our new way to be authenticated.

[Here is the function](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-users-permissions/config/policies/permissions.js) that manage the JWT validation.

To be able to customize it, you will have to create an new file in your application `./extensions/users-permissions/config/policies/permissions.js`.

Then copy the original function that is on GitHub and paste it in your new file.

When it's done, the Strapi application will use this function instead of the core one. We are readdy to customize it.

## Add token validation logic

You will have to update the first lines of this function.

**Path —** `./extensions/users-permissions/config/policies/permissions.js`

```js
const _ = require('lodash');

module.exports = async (ctx, next) => {
  let role;

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
          throw new Error('Invalid token: This token not exist');
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