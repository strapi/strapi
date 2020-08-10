# Email

Thanks to the plugin `Email`, you can send email from your server or externals providers such as **Sendgrid**.

## Programmatic usage

### Send an email - `.send()`

In your custom controllers or services you may want to send email.
By using the following function, Strapi will use the configured provider to send an email.

**Example**

```js
await strapi.plugins['email'].services.email.send({
  to: 'paulbocuse@strapi.io',
  from: 'joelrobuchon@strapi.io',
  cc: 'helenedarroze@strapi.io',
  bcc: 'ghislainearabian@strapi.io',
  replyTo: 'annesophiepic@strapi.io',
  subject: 'Use strapi email provider successfully',
  text: 'Hello world!',
  html: 'Hello world!',
});
```

### Send an email using a template - `.sendTemplatedEmail()`

When you send an email, you will most likely want to build it from a template you wrote.
The email plugin provides the service `sendTemplatedEmail` that compile the email and then sends it. The function have the following params:

| param           | description                                                                                                              | type   | default |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ | ------- |
| `emailOptions`  | Object that contains email options (`to`, `from`, `replyTo`, `cc`, `bcc`) except `subject`, `text` and `html`            | object | `{}`    |
| `emailTemplate` | Object that contains `subject`, `text` and `html` as [lodash string templates](https://lodash.com/docs/4.17.15#template) | object | `{}`    |
| `data`          | Object that contains the data used to compile the templates                                                              | object | `{}`    |

**Example**

```js
const emailTemplate = {
  subject: 'Welcome <%= user.firstname %>',
  text: `Welcome on mywebsite.fr!
    Your account is now linked with: <%= user.email %>.`,
  html: `<h1>Welcome on mywebsite.fr!</h1>
    <p>Your account is now linked with: <%= user.email %>.<p>`,
},

await strapi.plugins.email.services.email.sendTemplatedEmail(
  {
    to: user.email,
    // from: is not specified, so it's the defaultFrom that will be used instead
  },
  emailTemplate,
  {
    user: _.pick(user, ['username', 'email', 'firstname', 'lastname']),
  },
);
```

## Configure the plugin

By default Strapi provides a local email system ([sendmail](https://www.npmjs.com/package/sendmail)). If you want to use a third party to send emails, you need to install the correct provider module. Otherwise you can skip this part and continue to configure your provider.

You can check all the available providers developed by the community on npmjs.org - [Providers list](https://www.npmjs.com/search?q=strapi-provider-email-)

To install a new provider run:

:::: tabs

::: tab yarn

```
yarn add strapi-provider-email-sendgrid --save
```

:::

::: tab npm

```
npm install strapi-provider-email-sendgrid --save
```

:::

::::

#### Using scoped packages as providers

If your package name is [scoped](https://docs.npmjs.com/about-scopes) (for example `@username/strapi-provider-email-gmail-oauth2`) you need to take an extra step by aliasing it in `package.json`. Go to the `dependencies` section and change the provider line to look like this:

`"strapi-provider-email-gmail-oauth2": "npm:@username/strapi-provider-email-gmail-oauth2@0.1.9"`

The string after the last `@` represents your desired [semver](https://docs.npmjs.com/about-semantic-versioning) version range.

### Configure your provider

After installing your provider you will need to add some settings in `config/plugins.js`. If this file doesn't exists, you'll need to create it. Check the README of each provider to know what configuration settings the provider needs.

Here is an example of a configuration made for the provider [strapi-provider-email-sendgrid](https://www.npmjs.com/package/strapi-provider-email-sendgrid).

**Path —** `./config/plugins.js`.

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'sendgrid',
    providerOptions: {
      apiKey: env('SENDGRID_API_KEY'),
    },
    settings: {
      defaultFrom: 'juliasedefdjian@strapi.io',
      defaultReplyTo: 'juliasedefdjian@strapi.io',
    },
  },
  // ...
});
```

::: tip
If you're using a different provider depending on your environment, you can specify the correct configuration in `config/env/${yourEnvironment}/plugins.js`. More info here: [Environments](../concepts/configurations.md#environments)
:::

::: tip
When testing the new email provider with one the two templates created during strapi setup, the shipper email used is the one on the template, which is no-reply@strapi.io and it has to be modified to the email used with your email provider, otherwise it will fail the test.
More info here: [Configure templates Locally](http://localhost:1337/admin/plugins/users-permissions/email-templates)
:::

## Create new provider

If you want to create your own, make sure the name starts with `strapi-provider-email-` (duplicating an existing one will be easier) and customize the `send` function.

Default template

```js
module.exports = {
  init: (providerOptions = {}, settings = {}) => {
    return {
      send: async options => {},
    };
  },
};
```

In the `send` function you will have access to:

- `providerOptions` that contains configurations written in `plugins.js`
- `settings` that contains configurations written in `plugins.js`
- `options` that contains options you send when you call the `send` function from the email plugin service

To use it you will have to publish it on **npm**.

### Create a local provider

If you want to create your own provider without publishing it on **npm** you can follow these steps:

- Create a `providers` folder in your application.
- Create your provider as explained in the documentation eg. `./providers/strapi-provider-email-[...]/...`
- Then update your `package.json` to link your `strapi-provider-email-[...]` dependency to the [local path](https://docs.npmjs.com/files/package.json#local-paths) of your new provider.

```json
{
  ...
  "dependencies": {
    ...
    "strapi-provider-email-[...]": "file:providers/strapi-provider-email-[...]",
    ...
  }
}
```

- Finally, run `yarn install` or `npm install` to install your new custom provider.

## Troubleshooting

You received an `Auth.form.error.email.invalid` error even though the email is valid and exists in the database.

Here is the error response you get from the API.

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    {
      "messages": [
        {
          "id": "Auth.form.error.email.invalid"
        }
      ]
    }
  ]
}
```

This error is due to your IP connection. By default, Strapi uses the [`sendmail`](https://github.com/guileen/node-sendmail) package.

This package sends an email from the server it runs on. Depending on the network you are on, the connection to the SMTP server could fail.

Here is the `sendmail` error.

```
Error: SMTP code:550 msg:550-5.7.1 [87.88.179.13] The IP you're using to send mail is not authorized to
550-5.7.1 send email directly to our servers. Please use the SMTP relay at your
550-5.7.1 service provider instead. Learn more at
550 5.7.1  https://support.google.com/mail/?p=NotAuthorizedError 30si2132728pjz.75 - gsmtp
```

To fix it, we suggest you to use another email provider that uses third party to send emails.

When using a third party provider, you avoid having to setup a mail server on your server and get extra features such as email analytics.
