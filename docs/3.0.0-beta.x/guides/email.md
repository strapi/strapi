# Email

::: warning
This feature requires the Email plugin (installed by default).
:::

Thanks to the plugin `Email`, you can send email on your server or externals providers such as Sendgrid.

## Usage

```js
await strapi.plugins['email'].services.email.send({
  to: 'admin@strapi.io',
  from: 'robbot@strapi.io',
  replyTo: 'no-reply@strapi.io',
  subject: 'Use strapi email provider successfully',
  text: 'Hello world!',
  html: 'Hello world!'
});
```

## Install providers

By default Strapi provides a local email system. You might want to send email with a third party.

You can check all the available providers developed by the community on npmjs.org - [Providers list](https://www.npmjs.com/search?q=strapi-provider-email-)

To install a new provider run:

```
$ npm install strapi-provider-email-sendgrid@beta --save
```

::: note
If the provider is not in the mono repo, you probably don't need `@beta` depending if the creator published it with this tag or not.
:::

Then, visit `/admin/plugins/email/configurations/development` on your web browser and configure the provider.

## Create providers

If you want to create your own, make sure the name starts with `strapi-provider-email-` (duplicating an existing one will be easier), modify the `auth` config object and customize the `send` functions.
