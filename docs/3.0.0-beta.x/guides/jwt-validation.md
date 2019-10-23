# JWT validation

In this guide we will see how validate a JWT via another service.

When you signin with the authentication route `POST /auth/local`, Strapi generate a `JWT` that let your users request your API as an authenticated user.

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNTcxODIyMDAzLCJleHAiOjE1NzQ0MTQwMDN9.T5XQGSDZ6TjgM5NYaVDbYJt84qHZTrtBqWu1Q3ShINw",
  "user": {
    "email": "admin@strapi.io",
    "id": 1,
    "username": "admin"
  }
}
```

These users are managed in the application database and can be managed via the admin dashboard.

We can now imagine you have a `JWT` that come from [Auth0](https://auth0.com) and you want to make sure the `JWT` is correct and allow this user to use the Strapi API endpoints.

## Customise the JWT validation function

We have to use the [customization concept](../concepts/customization.md) to update the function that validate the `JWT`. This feature is powered by the **Users & Permissions** plugin.

Here is the file we will have to customize: [permission.js](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-users-permissions/config/policies/permissions.js)

- We have now to create a file that follow this path `./extensions/users-permissions/config/policies/permissions.js`.
- You will have to add in this new file, the same content of the original one.

Now we are ready to create our custom validation code.

## Write our own logic

First we have to define where write our code.

```js
const _ = require('lodash');

module.exports = async (ctx, next) => {
  let role;

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const { id, isAdmin = false } = await strapi.plugins[
        'users-permissions'
      ].services.jwt.getToken(ctx);

      ...

    } catch (err) {
      // It will be there!

      return handleErrors(ctx, err, 'unauthorized');
    }
```

The `jwt.getToken` will throw and error it the token don't come from Strapi. So if it's not a Strapi `JWT` token, lets test if it's an Auth0 token.

We will have to write our validation code before throwing an error.

By using the [Auth0 get user profile](https://auth0.com/docs/api/authentication?http#get-user-info) documentation, I will verify a valid user match with the current `JWT`

```js
const _ = require('lodash');
const axios = require('axios');

module.exports = async (ctx, next) => {
  let role;

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const { id, isAdmin = false } = await strapi.plugins[
        'users-permissions'
      ].services.jwt.getToken(ctx);

      ...

    } catch (err) {
      try {
        const data = await axios({
          method: 'post',
          url: 'http://YOUR_DOMAIN/userinfo',
          headers: {
            Authorization: ctx.request.header.authorization
          }
        });

        // if you want do more validation test
        // feel free to add your code here.

        return await next();
      } catch (error) {
        return handleErrors(ctx, new Error('Invalid token: Token did not match with Strapi and Auth0'), 'unauthorized');
      }

      return handleErrors(ctx, err, 'unauthorized');
    }
```

::: warning
In the code example we use `axios` you will have to install the dependence to make it works or use and other library to request Auth0 API.
:::
