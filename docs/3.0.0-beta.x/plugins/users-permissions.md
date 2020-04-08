---
sidebarDepth: 2
---

# Roles & Permissions

This plugin provides a way to protect your API with a full authentication process based on JWT. This plugin comes also with an ACL strategy that allows you to manage the permissions between the groups of users.

To access the plugin admin panel, click on the **Roles & Pemissions** link in the left menu.

## Concept

When this plugin is installed, it adds an access layer on your application.
The plugin uses [`jwt token`](https://en.wikipedia.org/wiki/JSON_Web_Token) to authenticate users.

Each time an API request is sent, the server checks if an `Authorization` header is present and verifies if the user making the request has access to the resource.

To do so, your JWT contains your user ID and we are able to match the group your user is in and at the end to know if the group allows access to the route.

## Manage role permissions

### Public role

This role is used when you receive a request that doesn't have an `Authorization` header.
If you allow some permissions in this role, everybody will be able to access the endpoints you selected.
This is common practice to select `find` / `findOne` endpoints when you want your front-end application to access all the content without developing user authentication and authorization.

### Authenticated role

This is the default role that is given to every **new user** if no role is provided at creation. In this role you will be able to define routes that a user can access.

### Permissions management

By clicking on the **Role** name, you will be able to see all functions available in your application (and these functions are related to a specific route)

If you check a function name, it makes this route accessible by the current role you are editing.
On the right sidebar you will be able to see the URL related to this function.

### Update the default role

When you create a user without a role or if you use the `/auth/local/register` route, the `authenticated` role is given to the user.

To change the default role, go to the `Advanced settings` tab and update the `Default role for authenticated users` option.

## Authentication

### Token usage

A jwt token may be used for making permission-restricted API requests. To make an API request as a user, place the jwt token into an `Authorization` header of the GET request. A request without a token, will assume the `public` role permissions by default. Modify the permissions of each user's role in admin dashboard. Authentication failures return a 401 (unauthorized) error.

#### Usage

- The `token` variable is the `data.jwt` received when logging in or registering.

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

Submit the user's identifier and password credentials for authentication. When the authentication is successful, the response data returned will have the user's information along with a jwt authentication token.

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

### Providers

Thanks to [Grant](https://github.com/simov/grant) and [Purest](https://github.com/simov/purest), you can easily use OAuth and OAuth2 providers to enable authentication in your application.

Before setting up a provider, you'll need to install the `ngrok` package globally to work with providers that don't allow `localhost` redirect URIs.

In the following examples, the client app will be the [react login examples app](https://github.com/strapi/strapi-examples/tree/master/login-react). It will be running on `http://localhost:3000`.

:::: tabs

::: tab GitHub

#### Setup the server

Use `ngrok` to serve the frontend app.

```
ngrok http 3000
```

#### Github configuration

- Visit the OAuth Apps list page <br> [https://github.com/settings/developers](https://github.com/settings/developers)
- Click on **New OAuth App** button

Then fill the informations:

- **Application name**: Strapi GitHub auth
- **Homepage URL**: `https://65e60559.ngrok.io`
- **Application description**: Strapi provider auth description
- **Authorization callback URL**: `https://65e60559.ngrok.io/connect/github`

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **GitHub** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: 53de5258f8472c140917
- **Client ID**: fb9d0fe1d345d9ac7f83d7a1e646b37c554dae8b
- **The redirect URL to your front-end app**: `https://65e60559.ngrok.io/connect/github`

:::

::: tab Facebook

#### Setup the server

Use `ngrok` to serve the server app.

```
ngrok http 1337
```

#### Facebook configuration

- Visit the Developer Apps list page <br> [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/)
- Click on **Add a New App** button
- Fill the **Display Name** in the modal and create the app
- Setup a **Facebook Login** product
- Click on the **PRODUCTS > Facebook login > Settings** link in the left menu

Then fill the informations:

- **Valid OAuth Redirect URIs**: `https://559394cd.ngrok.io/connect/facebook/callback`

To access the Application ID and secret:

- Click on **Settings** in the left menu
- Then on **Basic** link

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Facebook** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: 2408954435875229
- **Client ID**: 4fe04b740b69f31ea410b9391ff3b5b0
- **The redirect URL to your front-end app**: `http://localhost:3000/connect/facebook`

:::

::: tab Google

#### Google configuration

- Visit the Google Developer Console <br> [https://console.developers.google.com/](https://console.developers.google.com/)
- Click on the **Select a project** dropdown in the top menu
- Then click **NEW PROJECT** button
- Fill the **Project name** input and create

Wait a few seconds while the application is created.

- On the project dropdown, select your new project
- Click on **Go to APIs overview** Under the **APIs** card
- Then click on the **Credentials** link in the left menu
- Click on **OAuth consent screen** button
- Chose **External** and click on **create**
- Fill the **Application name** and save
- Then click on **Create credentials** button
- Chose **OAuth client ID** option

Then fill the informations:

- **Name**: `Strapi Auth`
- **Authorized redirect URIs**: `http://localhost:1337/connect/google/callback`

To access the Client ID and secret:

- Click on **OAuth 2.0 Client IDs** name of the client you just created

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Google** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: 226437944084-o2mojv5i4lfnng9q8kq3jkf5v03avemk.apps.googleusercontent.com
- **Client ID**: aiTbMoiuJQflSBy6uQrfgsni
- **The redirect URL to your front-end app**: `http://localhost:3000/connect/google`

:::

::: tab Twitter

#### Setup the server

Use `ngrok` to serve the frontend app.

```
ngrok http 3000
```

#### Twitter configuration

- Visit the Apps list page <br> [https://developer.twitter.com/en/apps](https://developer.twitter.com/en/apps)
- Click on **Create an app** button

Then fill the informations:

- **App name**: Strapi Twitter auth
- **Application description**: This is an demo app for Strapi auth
- **Website URL**: `https://65e60559.ngrok.io`
- **Callback URLs**: `https://65e60559.ngrok.io/connect/twitter`
- **Tell us how this app will be used**: - here write a message enough long -

To access the Consumer API keys:

- Click on **Keys and tokens** tab

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Twitter** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: yfN4ycGGmKXiS1njtIYxuN5IH
- **Client ID**: Nag1en8S4VwqurBvlW5OaFyKlzqrXFeyWhph6CZlpGA2V3VR3T
- **The redirect URL to your front-end app**: `https://65e60559.ngrok.io/connect/twitter`

:::

::: tab Discord

#### Discord configuration

- Visit the Apps list page on the developer portal <br> [https://discordapp.com/developers/applications/](https://discordapp.com/developers/applications/)
- Click on **New application** button
- Fill the **name** and create
- Click on **OAuth2** in the left menu
- And click on **Add redirect** button
- Fill the **Redirect** input with `http://localhost:1337/connect/discord/callback` URL and save

To access the Consumer API keys:

- Click on **General information** in the left menu

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Discord** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: 665118465148846081
- **Client ID**: iJbr7mkyqyut-J2hGvvSDch_5Dw5U77J
- **The redirect URL to your front-end app**: `http://localhost:3000/connect/discord`

:::

::: tab Twitch

#### Twitch configuration

- Visit the Apps list page on the developer console <br> [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
- Click on **Register Your Application** button

Then fill the informations:

- **Name**: Strapi auth
- **OAuth Redirect URLs**: `http://localhost:1337/connect/twitch/callback`
- **Category**: Chose a category

To access the Consumer API keys:

- Click on **Manage** button of your new app
- Then generate a new **Client Secret** with the **New Secret** button

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Twitch** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: amuy279g8wt68qlht3u4gek4oykh5j
- **Client ID**: dapssh10uo97gg2l25qufr8wen3yr6
- **The redirect URL to your front-end app**: `http://localhost:3000/connect/twitch`

:::

::: tab Instagram

#### Setup the server

Use `ngrok` to serve the server app.

```
ngrok http 1337
```

#### Facebook configuration

- Visit the Developer Apps list page <br> [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/)
- Click on **Add a New App** button
- Fill the **Display Name** in the modal and create the app
- Setup a **Instagram** product
- Click on the **PRODUCTS > Instagram > Basic Display** link in the left menu
- Then click on the **Create new application** button (and valid the modal)

Then fill the informations:

- **Valid OAuth Redirect URIs**: `https://c6a8cc7c.ngrok.io/connect/instagram/callback`
- **Deauthorize**: `https://c6a8cc7c.ngrok.io`
- **Data Deletion Requests**: `https://c6a8cc7c.ngrok.io`

On the **App Review for Instagram Basic Display** click on **Add to submition** for **instagram_graph_user_profile**.

Make sure your Application information are well completed.

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Instagram** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: 563883201184965
- **Client ID**: f5ba10a7dd78c2410ab6b8a35ab28226
- **The redirect URL to your front-end app**: `http://localhost:3000/connect/instagram`

:::

::: tab VK

#### VK configuration

- Visit the Apps list page <br> [https://vk.com/apps?act=manage](https://vk.com/apps?act=manage)
- Click on **Create app** button

Then fill the informations:

- **Title**: Strapi auth
- **Platform**: Chose **Website** option
- **Website address**: `http://localhost:1337`
- **Base domain**: `localhost`

Then setup OAuth seetings:

- Click on **Settings** link in the left menu
- Click on **Open API** link to enable this option

Then fill the informations:

- **Authorized redirect UR**: `http://localhost:1337/connect/vk/callback`

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **VK** provider

Then fill the informations:

- **Enable**: `ON`
- **Client ID**: 7276416
- **Client ID**: cFBUSghLXGuxqnCyw1N3
- **The redirect URL to your front-end app**: `http://localhost:3000/connect/vk`

:::

::::

Set your providers credentials in the admin interface (Plugin > Roles & Permissions > Providers).
Then update and enable the provider you want to use.

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

This action sends an email to a user with the link to your reset password page. This link contains a URL param `code` which is required to reset user password.

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

This action will send the user an email that contains a URL with the needed code for the [reset password](#password-reset).
The URL must link to your reset password form in your frontend application.

To configure it you will have to go in the Roles & Permissions settings and navigate to the Advanced Settings tab.

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
    passwordConfirmation: 'myNewPassword',
  })
  .then(response => {
    // Handle success.
    console.log("Your user's password has been changed.");
  })
  .catch(error => {
    // Handle error.
    console.log('An error occurred:', error);
  });
```

### Email validation

This action sends an email to the user with the link to confirm the user.

#### Usage

- email is the user email.

```js
import axios from 'axios';

// Request API.
axios
  .post(`http://localhost:1337/auth/send-email-confirmation`, {
    email: 'user@strapi.io',
  })
  .then(response => {
    // Handle success.
    console.log('Your user received an email');
  })
  .catch(error => {
    // Handle error.
    console.err('An error occured:', err);
  });
```

## User object in Strapi context

The `user` object is available to successfully authenticated requests.

#### Usage

- The authenticated `user` object is a property of `ctx.state`.

```js
create: async ctx => {
  const { id } = ctx.state.user;

  const depositObj = {
    ...ctx.request.body,
    depositor: id,
  };

  const data = await strapi.services.deposit.add(depositObj);

  // Send 201 `created`
  ctx.created(data);
};
```

## Adding a new provider (to your project)

To add a new provider on Strapi, you will need to perform changes onto the following files:

```
extensions/users-permissions/services/Providers.js
extensions/users-permissions/config/functions/bootstrap.js
extensions/users-permissions/admin/src/components/PopUpForm/index.js
extensions/users-permissions/admin/src/translations/en.json
```

If these files don't exist you will need to copy from your `node_modules` or the Strapi mono-repo. You can see the [plugin extensions](../concepts/customization.md#plugin-extensions) for more information as to how this works

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

By default, this plugin comes with only two templates (reset password and email address confirmation) at the moment. More templates will come later. The templates use Lodash's template() method to populate the variables.

You can update these templates under **Plugins** > **Roles & Permissions** > **Email Templates** tab in the admin panel.

### Reset Password

- `USER` (object)
  - `username`
  - `email`
  - ...and any other field that you added manually in the model.
- `TOKEN` corresponds to the token generated to be able to reset the password.
- `URL` is the link where the user will be redirected after clicking on it in the email.

### Email address confirmation

- `USER` (object)
  - `username`
  - `email`
  - ...and any other field that you added manually in the model.
- `CODE` corresponds to the CODE generated to be able confirm the user email.
- `URL` is the Strapi backend URL that confirms the code (by default `/auth/email-confirmation`).

## Security configuration

JWT tokens can be verified and trusted because the information is digitally signed. To sign a token a _secret_ is required. By default Strapi generates one that is stored in `./your-app/extensions/users-permissions/config/jwt.json`. This is useful during development but for security reasons it is **recommended** to set a custom token via an environment variable `JWT_SECRET` when deploying to production. It is also possible to modify `jwt.json` file to accept `JWT_TOKEN` automatically by doing following ([docs](https://strapi.io/documentation/3.0.0-beta.x/concepts/configurations.html#dynamic-configurations)).

```
  "jwtSecret": "${process.env.JWT_SECRET}"
```
