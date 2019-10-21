# Users & Permissions

This plugin provides a way to protect your API with a full authentication process based on JWT. This plugin comes also with an ACL strategy that allows you to manage the permissions between the groups of users.

To access the plugin admin panel, click on the **Users & Pemissions** link in the left menu.

## Concept

When this plugin is installed, it adds an access layer on your application.
The plugin uses [`jwt token`](https://fr.wikipedia.org/wiki/JSON_Web_Token) to authenticate users.

Each time an API request is sent, the server checks if an `Authorization` header is present and verifies if the user making the request has access to the resource..

To do so, your JWT contain your user ID and we are able to match the group your user is in and at the end to know if the group allows access to the route.

## Manage roles permissions

### Public role

This role is used when you receive a request that don't have `Authorization` header.
If you allow some permissions in this role, everybody will be able to access the endpoints you selected.
This is common practice to select `find` / `findOne` endpoints when you want your front-end application to access all the content without developing user authentication and authorization.

### Authenticated role

This is the default role that is given to every **new user** if no role is provided at creation. In this role you will be able to define routes that a user can access.

### Permissions management

By clicking on the **Role** name, you will be able to see all functions available in your application (and these function are related to a specific route)

If you check a fonction name, it makes this route accessible by the current role you are editing.
On the right sidebar you will be able to see the URL related to this function.

### Update the default role

When you create a user without a role or if you use the `/auth/local/register` route, the `authenticated` role is given to the user.

To change the default role, go to the `Advanced settings` tab and update the `Default role for authenticated users` option.

## Authentication

### Token usage

A jwt token may be used for making permission-restricted API requests. To make an API request as a user, place the jwt token into an `Authorization` header of the GET request. A request without a token, will assume the `public` role permissions by default. Modify the permissions of each user's role in admin dashboard. Authentication failures return a 401 (unauthorized) error.

#### Usage

- The `token` variable is the `data.jwt` received when login in or registering.

```js
import axios from 'axios';

const token = 'YOUR_TOKEN_HERE';

// Request API.
axios
  .get('http://localhost:1337/posts', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  .then(response => {
    // Handle success.
    console.log('Data: ', response.data);
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Registration

Creates a new user in the database with a default role as 'registered'.

#### Usage

```js
import axios from 'axios';

// Request API.
// Add your own code here to customize or restrict how the public can register new users.
axios
  .post('http://localhost:1337/auth/local/register', {
    username: 'Strapi user',
    email: 'user@strapi.io',
    password: 'strapiPassword',
  })
  .then(response => {
    // Handle success.
    console.log('Well done!');
    console.log('User profile', response.data.user);
    console.log('User token', response.data.jwt);
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Login

Submit the user's identifier and password credentials for authentication. When the authentication is successful, the response data returned will have the users' information along with a jwt authentication token.

#### Local

- The `identifier` param can either be an **email** or a **username**.

```js
import axios from 'axios';

// Request API.
axios
  .post('http://localhost:1337/auth/local', {
    identifier: 'user@strapi.io',
    password: 'strapiPassword',
  })
  .then(response => {
    // Handle success.
    console.log('Well done!');
    console.log('User profile', response.data.user);
    console.log('User token', response.data.jwt);
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

#### Providers

Thanks to [Grant](https://github.com/simov/grant) and [Purest](https://github.com/simov/purest), you can easily use OAuth and OAuth2
providers to enable authentication in your application. By default,
Strapi comes with the following providers:

- [Discord](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/discord_setup.md)
- [Facebook](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/fb_setup.md)
- [Google](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/google_setup.md)
- [Github](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/github_setup.md)
- [Twitter](https://github.com/strapi/strapi-examples/blob/master/login-react/doc/twitter_setup.md)

[👀 See our complete example with detailed tutorials for each provider (with React)](https://github.com/strapi/strapi-examples/tree/master/login-react)

---

Set your providers credentials in the admin interface (Plugin Users & Permissions > Providers).
Then update and enable the provider you want use.

To authenticate the user, use the GET method to request the url, `/connect/:provider`. eg: `GET /connect/facebook`.

You can also pass a custom callback url instead of using the default registered provider callback, by passing `callback` in the query. eg: `GET /connect/facebook?callback=https://my-frontend.com/en/auth/facebook`.

After authentication, create and customize your own redirect callback at `/auth/:provider/callback`. The `jwt` and `user` data will be available in a .json response.

Response payload:

```json
{
  "user": {},
  "jwt": ""
}
```

### Forgotten password

This action sends an email to a user with the link of you reset password page. This link contains an URL param `code` which is required to reset user password.

#### Usage

- `email` is your user email.

```js
import axios from 'axios';

// Request API.
axios
  .post('http://localhost:1337/auth/forgot-password', {
    email: 'user@strapi.io',
  })
  .then(response => {
    // Handle success.
    console.log('Your user received an email');
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

This action will send you an email that contains an URL with the needed code for the [reset password](#password-reset).
The URL have to be your frontend application that contains your reset password form.

To configure it you will have to got in the Users & Permissions settings and navigate in the Advanced tab.

### Password reset

This action will reset the user password.

#### Usage

- `code` is the url params received from the email link (see forgot password)

```js
import axios from 'axios';

// Request API.
axios
  .post('http://localhost:1337/auth/reset-password', {
    code: 'privateCode',
    password: 'myNewPassword',
    passwordConfirmation: 'myNewPassword'
  })
  .then(response => {
    // Handle success.
    console.log('Your user\'s password has been changed.');
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
});
```

## User object in Strapi context

The `user` object is available to successfully authenticated requests.

#### Usage

- The authenticated `user` object is a property of `ctx.state`.

```js
create: async ctx => {
  const { _id } = ctx.state.user;

  const depositObj = {
    ...ctx.request.body,
    depositor: _id,
  };

  const data = await strapi.services.deposit.add(depositObj);

  // Send 201 `created`
  ctx.created(data);
};
```

## Adding a new provider (to the strapi project)

To add a new provider on Strapi, you will need to perform changes onto the following files:

```
packages/strapi-plugin-users-permissions/services/Providers.js
packages/strapi-plugin-users-permissions/config/functions/bootstrap.js
packages/strapi-plugin-users-permissions/admin/src/components/PopUpForm/index.js
packages/strapi-plugin-users-permissions/admin/src/translations/en.json
```

We will go step by step.

### Configure your Provider Request

Configure the new provider in the `Provider.js` file at the `getProfile` function.

The `getProfile` takes three params:

- **provider**: The name of the used provider as a string.
- **query**: The query is the result of the provider callback.
- **callback**: The callback function who will continue the internal Strapi login logic.

Here is an example that uses the `discord` provider.

### Configure your oauth generic information

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

This code creates a `Purest` object that gives us a generic way to interact with the provider's REST API.

For more specs on using the `Purest` module, please refer to the [Official Purest Documentation](https://github.com/simov/purest/tree/2.x)

You may also want to take a look onto the numerous already made configurations [here](https://github.com/simov/purest-providers/blob/master/config/providers.json).

### Retrieve your user's information:

For our discord provider it will look like:

```js
  discord.query().get('users/@me').auth(access_token).request((err, res, body) => {
    if (err) {
      callback(err);
    } else {
      // Combine username and discriminator because discord username is not unique
      const username = `${body.username}#${body.discriminator}`;
      callback(null, {
        username,
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

### Configure the new provider model onto database

Now, we need to configure our 'model' for our new provider. That way, our settings can be stored in the database, and
managed from the admin panel.

Open the file `packages/strapi-plugin-users-permissions/config/functions/bootstrap.js`

Add the fields your provider needs into the `grantConfig` object.
For our discord provider it will look like:

```js
discord: {
  enabled: false,  // make this provider disabled by default
  icon: 'comments', // The icon to use on the UI
  key: '',  // our provider app id (leave it blank, you will fill it with the content manager)
  secret: '', // our provider secret key (leave it blank, you will fill it with the content manager)
  callback: '/auth/discord/callback', // the callback endpoint of our provider
  scope: [  // the scope that we need from our user to retrieve information
    'identify',
    'email'
  ]
},
```

<!-- #### Tests -->
<!-- TODO Add documentation about how to configure unit test for the new provider -->

### Configure frontend for your new provider

To make the new provider available on the front end of the application,
edit `packages/strapi-plugin-users-permissions/admin/src/components/PopUpForm/index.js`
Add the new provider info. For our discord provider it will look like:

```js
case 'discord':
  return `${strapi.backendURL}/connect/discord/callback`;
```

### Add language translation

Add the language translation in `packages/strapi-plugin-users-permissions/admin/src/translations/en.json`

```js
'PopUpForm.Providers.discord.providerConfig.redirectURL': 'The redirect URL to add in your Discord application configurations',
```

These two change will set up the popup message that appears in the UI. That's it, now you should be able to use your new provider.

## Templating emails

By default, this plugin comes with only one template (reset password) for the moment. More templates will come later. The templates use Lodash' template() method to populate the variables.

You can update these template in the **Email Templates** tab in the admin panel.

### Reset Password

- `USER` (object)
  - `username`
  - `email`
  - ...and every other fields that you added manually in the model.
- `TOKEN` corresponds to the token generated to be able to reset the password.
- `URL` is the link where the user will be redirected after clicking on it in the email.

### Email address confirmation

- `USER` (object)
  - `username`
  - `email`
  - ...and every other fields that you added manually in the model.
- `CODE` corresponds to the CODE generated to be able confirm the user email.
- `URL` is the Strapi backend URL that confirm the code (by default `/auth/email-confirmation`).
