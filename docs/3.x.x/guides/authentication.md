# Authentication

::: warning
This feature requires the Users & Permissions plugin (installed by default).
:::

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
Strapi comes with the following providers: 
- [Discord](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/discord_setup.md) 
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
  url: 'http://localhost:1337/articles',
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
- `url` is the url link that user will receive. After the user triggers a new password reset, 
it is used to redirect the user to the new-password form. 

```js
$.ajax({
  type: 'POST',
  url: 'http://localhost:1337/auth/forgot-password',
  data: {
    email: 'user@strapi.io',
    url: 'http:/localhost:1337/admin/plugins/users-permissions/auth/reset-password'
  },
  done: function() {
    console.log('Your user received an email');
  },
  fail: function(error) {
    console.log('An error occurred:', error);
  }
});
```

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
The `user` object is available to successfully authenticated requests.

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

## Add a new provider

To add a new provider on Strapi, you will need to perform changes onto the following files:

```
packages/strapi-plugin-users-permissions/services/Providers.js
packages/strapi-plugin-users-permissions/config/functions/bootstrap.js
packages/strapi-plugin-users-permissions/admin/src/components/PopUpForm/index.js
packages/strapi-plugin-users-permissions/admin/src/translations/en.json
```

We will go step by step.

### Configure your Provider Request
First, we need to configure our new provider onto `Provider.js` file.

Jump onto the `getProfile` function, you will see the list of currently available providers in the form of a `switch...case`.

As you can see, `getProfile` take three params:

1. provider :: The name of the used provider as a string.
2. query :: The query is the result of the provider callback.
3. callback :: The callback function who will continue the internal Strapi login logic.

Let's take the `discord` one as an example since it's not the easier, it should cover most of the case you 
may encounter trying to implement your own provider.

#### Configure your oauth generic information

```js
    case 'discord': {
      const discord = new Purest({
        provider: 'discord',
        config: {
          'discord': {
            'https://discordapp.com/api/': {
              '__domain': {
                'auth': {
                  'auth': {'bearer': '[0]'}
                }
              },
              '{endpoint}': {
                '__path': {
                  'alias': '__default'
                }
              }
            }
          }
        }
      });
    }
```

So here, you can see that we use a module called `Purest`. This module gives us with a generic way to interact 
with the REST API.

To understand each value usage, and the templating syntax, I invite you to read the [Official Purest Documentation](https://github.com/simov/purest/tree/2.x)

You may also want to take a look onto the numerous already made configurations [here](https://github.com/simov/purest-providers/blob/master/config/providers.json).

#### Retrieve your user informations:
```js
      discord.query().get('users/@me').auth(access_token).request((err, res, body) => {
        if (err) {
          callback(err);
        } else {
          // Combine username and discriminator because discord username is not unique
          var username = `${body.username}#${body.discriminator}`;
          callback(null, {
            username: username,
            email: body.email
          });
        }
      });
      break;
    }
```

Here is the next part of our switch. Now that we have properly configured our provider, we want to use it to retrieve 
user information.

Here you see the real power of `purest`, you can simply make a get request on the desired URL, using the `access_token` 
from the `query` parameter to authenticate.

That way, you should be able to retrieve the user info you need.

Now, you can simply call the `callback` function with the username and email of your user. That way, strapi will be able 
to retrieve your user from the database and log you in.

#### Configure the new provider model onto database

Now, we need to configure our 'model' for our new provider. That way, our settings can be stored in the database, and 
managed from the admin panel.

Into: `packages/strapi-plugin-users-permissions/config/functions/bootstrap.js`

Simply add the fields your provider need into the `grantConfig` object.
For our discord provider it will look like:

```js
    discord: {
      enabled: false,  // make this provider disabled by default
      icon: 'comments', // The icon to use on the UI
      key: '',  // our provider app id (leave it blank, you will fill it with the content manager)
      secret: '', // our provider secret key (leave it blank, you will fill it with the content manager)
      callback: '/auth/discord/callback', // the callback endpoint of our provider
      scope: [  // the scope that we need from our user to retrieve infos
        'identify',
        'email'
      ]
    },
```

You have already done the hard part, now, we simply need to make our new provider available from the front 
side of our application. So let's do it!

<!-- #### Tests -->
<!-- TODO Add documentation about how to configure unit test for the new provider -->

### Configure frontend for your new provider

First, let's edit: `packages/strapi-plugin-users-permissions/admin/src/components/PopUpForm/index.js`
As for backend, we have a `switch...case` where we need to put our new provider info.

```js
      case 'discord':
        return `${strapi.backendURL}/connect/discord/callback`;
```

Add the corresponding translation into: `packages/strapi-plugin-users-permissions/admin/src/translations/en.json`

```js
  "PopUpForm.Providers.discord.providerConfig.redirectURL": "The redirect URL to add in your Discord application configurations",
````

These two change will set up the popup message who appear on the UI when we will configure our new provider.

That's it, now you should be able to use your new provider.

## Email templates

[See the documentation on GitHub](https://github.com/strapi/strapi/blob/master/packages/strapi-plugin-users-permissions/docs/email-templates.md)
