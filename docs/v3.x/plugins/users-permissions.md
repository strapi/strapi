---
sidebarDepth: 2
---

# Roles & Permissions

This plugin provides a way to protect your API with a full authentication process based on JWT. This plugin comes also with an ACL strategy that allows you to manage the permissions between the groups of users.

To access the plugin admin panel, click on the **Roles & Permissions** link in the left menu.

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
    console.log('An error occurred:', error.response);
  });
```

### JWT configuration

You can configure option for the JWT generation by creating `extensions/users-permissions/config/security.json` file.
We are using [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) to generate the JWT.

Available options:

- `expiresIn`: expressed in seconds or a string describing a time span zeit/ms.<br>
  Eg: 60, "2 days", "10h", "7d". A numeric value is interpreted as a seconds count. If you use a string be sure you provide the time units (days, hours, etc), otherwise milliseconds unit is used by default ("120" is equal to "120ms").

**Path —** `extensions/users-permissions/config/security.json`

```json
{
  "jwt": {
    "expiresIn": "1d"
  }
}
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
    console.log('An error occurred:', error.response);
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
    console.log('An error occurred:', error.response);
  });
```

### Providers

Thanks to [Grant](https://github.com/simov/grant) and [Purest](https://github.com/simov/purest), you can easily use OAuth and OAuth2 providers to enable authentication in your application.

For better understanding, you may find as follows the description of the login flow. To simplify the explanation, we used `github` as the provider but it works the same for the other providers.

#### Understanding the login flow

Let's say that strapi's backend is located at: strapi.website.com.
Let's say that your app frontend is located at: website.com.

1. The user goes on your frontend app (`https://website.com`) and click on your button `connect with Github`.
2. The frontend redirect the tab to the backend URL: `https://strapi.website.com/connect/github`.
3. The backend redirects the tab to the GitHub login page where the user logs in.
4. Once done, Github redirects the tab to the backend URL:`https://strapi.website.com/connect/github/callback?code=abcdef`.
5. The backend uses the given `code` to get from Github an `access_token` that can be used for a period of time to make authorized requests to Github to get the user info (the email of the user of example).
6. Then, the backend redirects the tab to the url of your choice with the param `access_token` (example: `http://website.com/connect/github/redirect?access_token=eyfvg`)
7. The frontend (`http://website.com/connect/github/redirect`) calls the backend with `https://strapi.website.com/auth/github/callback?access_token=eyfvg` that returns the strapi user profile with its `jwt`. <br> (Under the hood, the backend asks Github for the user's profile and a match is done on Github user's email address and Strapi user's email address)
8. The frontend now possesses the user's `jwt`, with means the user is connected and the frontend can make authenticated requests to the backend!

An example of a frontend app that handles this flow can be found here: [react login example app](https://github.com/strapi/strapi-examples/tree/master/login-react).

#### Setting up the server url

Before setting up a provider, you need to specify the absolute url of your backend in `server.js`.

**example -** `config/server.js`

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('', 'http://localhost:1337'),
});
```

:::tip
Later on you will give this url to your provider. <br> For development, some providers accept the use of localhost urls but many don't. In this case we recommand to use [ngrok](https://ngrok.com/docs) (`ngrok http 1337`) that will make a proxy tunnel from a url it created to your localhost url (ex: `url: env('', 'https://5299e8514242.ngrok.io'),`).
:::

#### Setting up the provider - examples

Instead of a generic explanation, for better understanding, we decided to show an example for each provider.

In the following examples, the frontend app will be the [react login example app](https://github.com/strapi/strapi-examples/tree/master/login-react). <br>
It (the frontend app) will be running on `http://localhost:3000`. <br>
Strapi (the backend) will be running on `http://localhost:1337`.

:::: tabs

::: tab GitHub

#### Using ngrok

Github doesn't accept `localhost` urls. <br>
Use `ngrok` to serve the backend app.

```
ngrok http 1337
```

Don't forget to update the server url in the backend config file `config/server.js` and the server url in your frontend app (environment variable `REACT_APP_BACKEND_URL` if you use [react login example app](https://github.com/strapi/strapi-examples/tree/master/login-react)) with the generated ngrok url.

#### Github configuration

- Visit the OAuth Apps list page [https://github.com/settings/developers](https://github.com/settings/developers)
- Click on **New OAuth App** button
- Fill the information (replace with your own ngrok url):
  - **Application name**: Strapi GitHub auth
  - **Homepage URL**: `https://65e60559.ngrok.io`
  - **Application description**: Strapi provider auth description
  - **Authorization callback URL**: `https://65e60559.ngrok.io/connect/github/callback`

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **GitHub** provider
- Fill the information (replace with your own client ID and secret):
  - **Enable**: `ON`
  - **Client ID**: 53de5258f8472c140917
  - **Client Secret**: fb9d0fe1d345d9ac7f83d7a1e646b37c554dae8b
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/github/redirect`

:::

::: tab Facebook

#### Using ngrok

Facebook doesn't accept `localhost` urls. <br>
Use `ngrok` to serve the backend app.

```
ngrok http 1337
```

Don't forget to update the server url in the backend config file `config/server.js` and the server url in your frontend app (environment variable `REACT_APP_BACKEND_URL` if you use [react login example app](https://github.com/strapi/strapi-examples/tree/master/login-react)) with the generated ngrok url.

#### Facebook configuration

- Visit the Developer Apps list page <br> [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/)
- Click on **Add a New App** button
- Fill the **Display Name** in the modal and create the app
- Setup a **Facebook Login** product
- Click on the **PRODUCTS > Facebook login > Settings** link in the left menu
- Fill the information and save (replace with your own ngrok url):
  - **Valid OAuth Redirect URIs**: `https://65e60559.ngrok.io/connect/facebook/callback`
- Then, click on **Settings** in the left menu
- Then on **Basic** link
- You should see your Application ID and secret, save them for later

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Facebook** provider
- Fill the information (replace with your own client ID and secret):
  - **Enable**: `ON`
  - **Client ID**: 2408954435875229
  - **Client Secret**: 4fe04b740b69f31ea410b9391ff3b5b0
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/facebook/redirect`

:::

::: tab Google

#### Using ngrok

Google accepts the `localhost` urls. <br>
The use of `ngrok` is not needed.

#### Google configuration

- Visit the Google Developer Console <br> [https://console.developers.google.com/](https://console.developers.google.com/)
- Click on the **Select a project** dropdown in the top menu
- Then click **NEW PROJECT** button
- Fill the **Project name** input and create

Wait a few seconds while the application is created.

- On the project dropdown, select your new project
- Click on **Go to APIs overview** under the **APIs** card
- Then click on the **Credentials** link in the left menu
- Click on **OAuth consent screen** button
- Choose **External** and click on **create**
- Fill the **Application name** and save
- Then click on **Create credentials** button
- Choose **OAuth client ID** option
- Fill the information:
  - **Name**: `Strapi Auth`
  - **Authorized redirect URIs**: `http://localhost:1337/connect/google/callback`
- Click on **OAuth 2.0 Client IDs** name of the client you just created
- You should see your Application ID and secret, save them for later

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Google** provider
- Fill the information (replace with your own client ID and secret):
  - **Enable**: `ON`
  - **Client ID**: 226437944084-o2mojv5i4lfnng9q8kq3jkf5v03avemk.apps.googleusercontent.com
  - **Client Secret**: aiTbMoiuJQflSBy6uQrfgsni
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/google/redirect`

:::

::: tab Twitter

#### Using ngrok

Twitter doesn't accept `localhost` urls. <br>
Use `ngrok` to serve the backend app.

```
ngrok http 1337
```

Don't forget to update the server url in the backend config file `config/server.js` and the server url in your frontend app (environment variable `REACT_APP_BACKEND_URL` if you use [react login example app](https://github.com/strapi/strapi-examples/tree/master/login-react)) with the generated ngrok url.

#### Twitter configuration

- Visit the Apps list page <br> [https://developer.twitter.com/en/apps](https://developer.twitter.com/en/apps)
- Click on **Create an app** button
- Fill the information (replace with your own ngrok url):
  - **App name**: Strapi Twitter auth
  - **Application description**: This is a demo app for Strapi auth
  - **Tell us how this app will be used**: - here write a message enough long -
- At the end of the process you should see your Application ID and secret, save them for later
- Go to you app setting and click on edit **Authentication settings**
- Enable **3rd party authentication** AND **Request email address from users**
- Fill the information (replace with your own ngrok url):
  - **Callback URLs**: `https://65e60559.ngrok.io/connect/twitter/callback`
  - **Website URL**: `https://65e60559.ngrok.io`
  - **Privacy policy**: `https://d73e70e88872.ngrok.io`
  - **Terms of service**: `https://d73e70e88872.ngrok.io`

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Twitter** provider
- Fill the information (replace with your own client ID and secret):
  - **Enable**: `ON`
  - **Client ID**: yfN4ycGGmKXiS1njtIYxuN5IH
  - **Client Secret**: Nag1en8S4VwqurBvlW5OaFyKlzqrXFeyWhph6CZlpGA2V3VR3T
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/twitter/redirect`

:::

::: tab Discord

#### Using ngrok

Discord accepts the `localhost` urls. <br>
The use of `ngrok` is not needed.

#### Discord configuration

- Visit the Apps list page on the developer portal <br> [https://discordapp.com/developers/applications/](https://discordapp.com/developers/applications/)
- Click on **New application** button
- Fill the **name** and create
- Click on **OAuth2** in the left menu
- And click on **Add redirect** button
- Fill the **Redirect** input with `http://localhost:1337/connect/discord/callback` URL and save
- Click on **General information** in the left menu
- You should see your Application ID and secret, save them for later

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Discord** provider
- Fill the information (replace with your own client ID and secret):
  - **Enable**: `ON`
  - **Client ID**: 665118465148846081
  - **Client Secret**: iJbr7mkyqyut-J2hGvvSDch_5Dw5U77J
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/discord/redirect`

:::

::: tab Twitch

#### Using ngrok

Discord accepts the `localhost` urls. <br>
The use of `ngrok` is not needed.

#### Twitch configuration

- Visit the Apps list page on the developer console <br> [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
- Click on **Register Your Application** button
- Fill the information:
  - **Name**: Strapi auth
  - **OAuth Redirect URLs**: `http://localhost:1337/connect/twitch/callback`
  - **Category**: Choose a category
- Click on **Manage** button of your new app
- Generate a new **Client Secret** with the **New Secret** button
- You should see your Application ID and secret, save them for later

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Twitch** provider
- Fill the information (replace with your own client ID and secret):
  - **Enable**: `ON`
  - **Client ID**: amuy279g8wt68qlht3u4gek4oykh5j
  - **Client Secret**: dapssh10uo97gg2l25qufr8wen3yr6
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/twitch/redirect`

:::

::: tab Instagram

#### Using ngrok

Facebook doesn't accept `localhost` urls. <br>
Use `ngrok` to serve the backend app.

```
ngrok http 1337
```

Don't forget to update the server url in the backend config file `config/server.js` and the server url in your frontend app (environment variable `REACT_APP_BACKEND_URL` if you use [react login example app](https://github.com/strapi/strapi-examples/tree/master/login-react)) with the generated ngrok url.

#### Instagram configuration

- Visit the Developer Apps list page <br> [https://developers.facebook.com/apps/](https://developers.facebook.com/apps/)
- Click on **Add a New App** button
- Fill the **Display Name** in the modal and create the app
- Setup an **Instagram** product
- Click on the **PRODUCTS > Instagram > Basic Display** link in the left menu
- Then click on the **Create new application** button (and valid the modal)
- Fill the information (replace with your own ngrok url):
  - **Valid OAuth Redirect URIs**: `https://65e60559.ngrok.io/connect/instagram/callback`
  - **Deauthorize**: `https://65e60559.ngrok.io`
  - **Data Deletion Requests**: `https://65e60559.ngrok.io`
- On the **App Review for Instagram Basic Display** click on **Add to submission** for **instagram_graph_user_profile**.
- You should see your Application ID and secret, save them for later

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **Instagram** provider
- Fill the information (replace with your own client ID and secret):
  - **Enable**: `ON`
  - **Client ID**: 563883201184965
  - **Client Secret**: f5ba10a7dd78c2410ab6b8a35ab28226
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/instagram/redirect`

:::

::: tab VK

#### Using ngrok

Discord accepts the `localhost` urls. <br>
The use of `ngrok` is not needed.

#### VK configuration

- Visit the Apps list page <br> [https://vk.com/apps?act=manage](https://vk.com/apps?act=manage)
- Click on **Create app** button
- Fill the information:
  - **Title**: Strapi auth
  - **Platform**: Choose **Website** option
  - **Website address**: `http://localhost:1337`
  - **Base domain**: `localhost`
- Click on the **Settings** link in the left menu
- Click on the **Open API** link to enable this option
- Fill the information:
  - **Authorized redirect URL**: `http://localhost:1337/connect/vk/callback`

#### Strapi configuration

- Visit the User Permissions provider settings page <br> [http://localhost:1337/admin/plugins/users-permissions/providers](http://localhost:1337/admin/plugins/users-permissions/providers)
- Click on the **VK** provider
- Fill the information:
  - **Enable**: `ON`
  - **Client ID**: 7276416
  - **Client Secret**: cFBUSghLXGuxqnCyw1N3
  - **The redirect URL to your front-end app**: `http://localhost:3000/connect/vk/redirect`

:::

::::

Your configuration is done.
Launch the backend and the [react login example app](https://github.com/strapi/strapi-examples/tree/master/login-react), go to `http://localhost:3000` and try to connect to the provider your configured. It should work 🎉

#### What you have to do in your frontend

Once you have configured strapi and the provider, in your frontend app you have to :

- Create a button that links to `GET STRAPI_BACKEND_URL/connect/${provider}` (ex: `https://strapi.mywebsite/connect/github`).
- Create a frontend route like `FRONTEND_URL/connect/${provider}/redirect` that have to handle the `access_token` param and that have to request `STRAPI_BACKEND_URL/auth/${provider}/callback` with the `access_token` param. <br >
  The JSON request response will be `{ "jwt": "...", "user": {...} }`.

Now you can make authenticated requests 🎉 More info here: [token usage](#token-usage).

:::warning Troubleshooting

- **Error 429**: It's most likely because your login flow fell into a loop. To make new requests to the backend, you need to wait a few minutes or restart the backend.
- **Grant: missing session or misconfigured provider**: It may be du to many things.
  - **The redirect url can't be built**: Make sure you have set the backend url in `config/server.js`: [Setting up the server url](#setting-up-the-server-url)
  - **A session/cookie/cache problem**: You can try again in a private tab.
  - **The incorrect use of a domain with ngrok**: Check your urls and make sure that you use the ngrok url instead of `http://localhost:1337`. Don't forget to check the backend url set in the example app at `src/config.js`.
- **You can't access your admin panel**: It's most likely because you built it with the backend url set with a ngrok url and you stopped/restarted ngrok. You need to replace the backend url with the new ngrok url and run `yarn build` or `npm run build` again.
  :::

### Forgotten & reset password

**Can only be used for users registered using the email provider.**

The flow was thought this way:

1. The user goes to your **forgotten password page**
2. The user enters his/her email address
3. Your forgotten password page sends a request to the backend to send an email with the reset password link to the user
4. The user receives the email, and clicks on the special link
5. The link redirects the user to your **reset password page**
6. The user enters his/her new password
7. The **reset password page** sends a request to the backend with the new password
8. If the request contains the code contained in the link at step 3., the password is updated
9. The user can log in with the new password

In the following section we will detail steps 3. and 7..

#### Forgotten password: ask for the reset password link

This action sends an email to a user with the link to your own reset password page.
The link will be enriched with the url param `code` that is needed for the [reset password](#reset-password) at step 7..

First, you must specify the url to your reset password page in the admin panel: **Roles & Permissions > Advanced Settings > Reset Password Page**.

Then, your **forgotten password page** has to make the following request to your backend.

```js
import axios from 'axios';

// Request API.
axios
  .post('http://localhost:1337/auth/forgot-password', {
    email: 'user@strapi.io', // user's email
  })
  .then(response => {
    console.log('Your user received an email');
  })
  .catch(error => {
    console.log('An error occurred:', error.response);
  });
```

#### Reset Password: send the new password

This action will update the user password.
Also works with the [GraphQL Plugin](./graphql.md), with the `resetPassword` mutation.

Your **reset password page** has to make the following request to your backend.

```js
import axios from 'axios';

// Request API.
axios
  .post('http://localhost:1337/auth/reset-password', {
    code: 'privateCode', // code contained in the reset link of step 3.
    password: 'userNewPassword',
    passwordConfirmation: 'userNewPassword',
  })
  .then(response => {
    console.log("Your user's password has been reset.");
  })
  .catch(error => {
    console.log('An error occurred:', error.response);
  });
```

Congrats, you're done!

### Email validation

:::tip NOTE
In production, make sure the `url` config property is set. Otherwise the validation link will redirect to `localhost`. More info on the config [here](../concepts/configurations.md#server).
:::

After having registered, if you have set **Enable email confirmation** to **ON**, the user will receive a confirmation link by email. The user has to click on it to validate his/her registration.

_Example of the confirmation link:_ `https://yourwebsite.com/auth/email-confirmation?confirmation=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNTk0OTgxMTE3LCJleHAiOjE1OTc1NzMxMTd9.0WeB-mvuguMyr4eY8CypTZDkunR--vZYzZH6h6sChFg`

If needed, you can re-send the confirmation email by making the following request.

```js
import axios from 'axios';

// Request API.
axios
  .post(`http://localhost:1337/auth/send-email-confirmation`, {
    email: 'user@strapi.io', // user's email
  })
  .then(response => {
    console.log('Your user received an email');
  })
  .catch(error => {
    console.error('An error occurred:', error.response);
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

**Only providers handled by [grant](https://github.com/simov/grant) are supported**. <br> You can check the 180+ supported providers list there: [https://github.com/simov/grant#180-supported-providers--oauth-playground](https://github.com/simov/grant#180-supported-providers--oauth-playground).

### Prepare your files

To add a new provider on Strapi, you will need to perform changes onto the following files:

```
extensions/users-permissions/services/Providers.js
extensions/users-permissions/config/functions/bootstrap.js
extensions/users-permissions/admin/src/components/PopUpForm/index.js
extensions/users-permissions/admin/src/translations/en.json
```

If these files don't exist you will need to copy from your `node_modules` or the Strapi mono-repo. You can see [plugin extensions](../concepts/customization.md#plugin-extensions) for more information on how it works.

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

For more specs on using the `Purest` module, please refer to the [Official Purest Documentation](https://github.com/simov/purest)

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

Now, you can simply call the `callback` function with the username and email of your user. That way, Strapi will be able
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

### Rebuild the Admin Panel

Please see the following [documentation](../admin-panel/customization.md#build) on rebuilding the admin panel.

## Templating emails

By default, this plugin comes with only two templates (reset password and email address confirmation) at the moment. More templates will come later. The templates use Lodash's template() method to populate the variables.

You can update these templates under **Plugins** > **Roles & Permissions** > **Email Templates** tab in the admin panel.

### Reset Password

- `USER` (object)
  - `username`
  - `email`
- `TOKEN` corresponds to the token generated to be able to reset the password.
- `URL` is the link where the user will be redirected after clicking on it in the email.

### Email address confirmation

- `USER` (object)
  - `username`
  - `email`
- `CODE` corresponds to the CODE generated to be able confirm the user email.
- `URL` is the Strapi backend URL that confirms the code (by default `/auth/email-confirmation`).

## Security configuration

JWT tokens can be verified and trusted because the information is digitally signed. To sign a token a _secret_ is required. By default Strapi generates one that is stored in `./extensions/users-permissions/config/jwt.js`. This is useful during development but for security reasons it is **recommended** to set a custom token via an environment variable `JWT_SECRET` when deploying to production.

By default you can set a `JWT_SECRET` environment variable and it will be used as secret. If you want to use another variable you can update the configuration file.

**Path -** `./extensions/users-permissions/config/jwt.js`.

```js
module.exports = {
  jwtSecret: process.env.SOME_ENV_VAR,
};
```

::: tip
You can learn more on configuration in the documentation [here](../concepts/configurations.md)
:::
