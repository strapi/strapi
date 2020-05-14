# Email

Thanks to the plugin `Email`, you can send email from your server or externals providers such as **Sendgrid**.

## Programmatic usage

In your custom controllers or services you may want to send email.
By using the following function, strapi will use the configured provider to send an email.

```js
await strapi.plugins['email'].services.email.send({
  to: 'paulbocuse@strapi.io',
  from: 'joelrobuchon@strapi.io',
  cc: 'lauralumale@strapi.io',
  bcc: 'arthurpapailhau@strapi.io',
  replyTo: 'no-reply@strapi.io',
  subject: 'Use strapi email provider successfully',
  text: 'Hello world!',
  html: 'Hello world!',
});
```

## Configure the plugin

The plugin provides you a settings page where you can define the email provider you want to use.
You will also be able to add some configuration.

- Click on **Plugins** in the left menu
- Click on the cog button on the **Email** plugin line

## Install new providers

By default Strapi provides a local email system. You might want to send email with a third party.

You can check all the available providers developed by the community on npmjs.org - [Providers list](https://www.npmjs.com/search?q=strapi-provider-email-)

To install a new provider run:

:::: tabs

::: tab yarn

```
yarn add strapi-provider-email-sendgrid@beta --save
```

:::

::: tab npm

```
npm install strapi-provider-email-sendgrid@beta --save
```

:::

::::

::: tip
If the provider is not in the mono repo, you probably don't need `@beta` depending if the creator published it with this tag or not.
:::

Then, visit [http://localhost:1337/admin/plugins/email/configurations/development](http://localhost:1337/admin/plugins/email/configurations/development) on your web browser and configure the provider.

## Create new provider

If you want to create your own, make sure the name starts with `strapi-provider-email-` (duplicating an existing one will be easier), modify the `auth` config object and customize the `send` function.

Default template

```js
module.exports = {
  provider: 'provider-id',
  name: 'display name',
  auth: {
    config_1: {
      label: 'My Config 1',
      type: 'text',
    },
  },
  init: config => {
    return {
      send: async options => {},
    };
  },
};
```

In the `send` function you will have access to:

- `config` that contains configurations you setup in your admin panel
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

## Trouble shooting

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

To fix it, I suggest you to use another email provider that uses third party to send emails.

When using a third party provider, you avoid having to setup a mail server on your server and get extra features such as email analytics.
