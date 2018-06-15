# Authentication

> ⚠️  This feature requires the Users & Permissions plugin (installed by default).

## Register a new user

This route lets you create new users.

#### Usage

```js
$.ajax({
  type: 'POST',
  url: 'http://localhost:1337/auth/local/register',
  data: {
    username: 'Strapi user',
    email: 'user@strapi.io',
    password: 'strapiPassword'
  },
  done: function(auth) {
    console.log('Well done!');
    console.log('User profile', auth.user);
    console.log('User token', auth.jwt);
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## Login.

This route lets you login your users by getting an authentication token.

#### Local

- The `identifier` param can either be an email or a username.

```js
$.ajax({
  type: 'POST',
  url: 'http://localhost:1337/auth/local',
  data: {
    identifier: 'user@strapi.io',
    password: 'strapiPassword'
  },
  done: function(auth) {
    console.log('Well done!');
    console.log('User profile', auth.user);
    console.log('User token', auth.jwt);
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## Providers

Thanks to [Grant](https://github.com/simov/grant) and [Purest](https://github.com/simov/purest), you can easily use OAuth and OAuth2
providers to enable authentication in your application. By default,
Strapi comes with four providers:
- [Facebook](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/fb_setup.md)
- [Google](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/google_setup.md)
- [Github](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/github_setup.md)
- [Twitter](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/twitter_setup.md)

[👀   See our complete example with detailed tutorials for each provider (with React)](https://github.com/strapi/strapi-examples/tree/master/login-react)

---

To use the providers authentication, set your credentials in the admin interface (Plugin Users & Permissions > Providers).
Then update and enable the provider you want use.

Redirect your user to: `GET /connect/:provider`. eg: `GET /connect/facebook`

After his approval, he will be redirected to `/auth/:provider/callback`. The `jwt` and `user` data will be available in the body response.

Response payload:

```js
{
  "user": {},
  "jwt": ""
}
```

## Use your token to be identified as a user.

By default, each API request is identified as `guest` role (see permissions of `guest`'s role in your admin dashboard). To make a request as a user, you have to set the `Authorization` token in your request headers. You receive a 401 error if you are not authorized to make this request or if your authorization header is not correct.

#### Usage

- The `token` variable is the `data.jwt` received when login in or registering.

```js
$.ajax({
  type: 'GET',
  url: 'http://localhost:1337/article',
  headers: {
    Authorization: `Bearer ${token}`
  },
  done: function(data) {
    console.log('Your data', data);
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## Send forgot password request.

This action sends an email to a user with the link of you reset password page. This link contains an URL param `code` which is required to reset user password.

#### Usage

- `email` is your user email.
- `url` is the url link that user will receive.

```js
$.ajax({
  type: 'POST',
  url: 'http://localhost:1337/auth/forgot-password',
  data: {
    email: 'user@strapi.io',
    url: 'http://mon-site.com/rest-password'
  },
  done: function() {
    console.log('Your user received an email');
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

> Received link url format http://mon-site.com/rest-password?code=privateCode

## Reset user password.

This action will reset the user password.

#### Usage

- `code` is the url params received from the email link (see forgot password)

```js
$.ajax({
  type: 'POST',
  url: 'http://localhost:1337/auth/reset-password',
  data: {
    code: 'privateCode',
    password: 'myNewPassword',
    passwordConfirmation: 'myNewPassword'
  },
  done: function() {
    console.log('Your user password is reset');
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

## User Object In Strapi Context
The User object is available to successfully authenticated requests.

#### Usage
- The authenticated `user` object is a property of `ctx.state`.


```js
  create: async (ctx) => {

    const { _id } = ctx.state.user

    const depositObj = {
      ...ctx.request.body,
      depositor: _id
    }

    const data = await strapi.services.deposit.add(depositObj);

    // Send 201 `created`
    ctx.created(data);
  }

```


## Email templates

[See the documentation on GitHub](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-users-permissions/docs/email-templates.md)
