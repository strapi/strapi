# Email

> ⚠️  This feature requires the Email plugin (installed by default).

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

By default Strapi provides a local email system. You might want to send email with Sendgrid or another provider.

To install a new provider run:

```
$ npm install strapi-email-sendgrid@alpha --save
```

We have two providers available `strapi-email-sendgrid` and `strapi-upload-mailgun`, use the alpha tag to install one of them. Then, visit `/admin/plugins/email/configurations/development` and configure the provider.

If you want to create your own, make sure the name starts with `strapi-email-` (duplicating an existing one will be easier to create), modify the `auth` config object and customize the `send` functions.

Check all community providers available on npmjs.org - [Providers list](https://www.npmjs.com/search?q=strapi-email-)