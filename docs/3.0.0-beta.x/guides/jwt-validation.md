# JWT validation

In this guide we will see how to validate a `JWT` (JSON Web Token) with a third party service.

When you sign in with the authentication route `POST /auth/local`, Strapi generates a `JWT` which lets your users request your API as an authenticated one.

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

These users are managed in the application's database and can be managed via the admin dashboard.

We can now imagine you have a `JWT` that comes from [Auth0](https://auth0.com) and you want to make sure the `JWT` is correct before allowing the user to use the Strapi API endpoints.

## Customize the JWT validation function

We have to use the [customization concept](../concepts/customization.md) to update the function that validates the `JWT`. This feature is powered by the **Users & Permissions** plugin.

Here is the file we will have to customize: [permission.js](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-users-permissions/config/policies/permissions.js)

- We have to create a file that follows this path `./extensions/users-permissions/config/policies/permissions.js`.
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

The `jwt.getToken` will throw an error if the token doesn't come from Strapi. So if it's not a Strapi `JWT` token, let's test if it's an Auth0 one.

We will have to write our validation code before throwing an error.

By using the [Auth0 get user profile](https://auth0.com/docs/api/authentication?http#get-user-info) documentation, you will verify a valid user matches with the current `JWT`

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
In the code example we use `axios` you will have to install the dependency to make it work. You can choose another library if you prefer.
:::
