# strapi-provider-email-nodemailer

---

## Deprecation Warning :warning:

Hello! We have some news to share,

We’ve decided it’ll soon be time to end the support for `strapi-provider-email-nodemailer`.

After years of iterations, Strapi is going to V4 and we won’t maintain V3 packages when it’ll reach its end-of-support milestone (~end of Q3 2022).

If you’ve been using `strapi-provider-email-nodemailer` and have migrated to V4 (or if you want to), you can find the equivalent and updated version of this package at this [URL](https://github.com/strapi/strapi/tree/master/packages/providers/email-nodemailer) and with the following name on NPM: `@strapi/provider-email-nodemailer`.

If you’ve contributed to the development of this package, thank you again for that! We hope to see you on the V4 soon.

The Strapi team

---

## Resources

- [License](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi community on Slack](https://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)

## Prerequisites

You need to have the plugin `strapi-plugin-email` installed in your Strapi project.

## Installation

```bash
# using yarn
yarn add strapi-provider-email-nodemailer

# using npm
npm install strapi-provider-email-nodemailer --save
```

## Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  email: {
    provider: 'nodemailer',
    providerOptions: {
      host: env('SMTP_HOST', 'smtp.example.com'),
      port: env('SMTP_PORT', 587),
      auth: {
        user: env('SMTP_USERNAME'),
        pass: env('SMTP_PASSWORD'),
      },
      // ... any custom nodemailer options
    },
    settings: {
      defaultFrom: 'hello@example.com',
      defaultReplyTo: 'hello@example.com',
    },
  },
});
```

Check out the available options for nodemailer: https://nodemailer.com/about/

### Development mode

You can override the default configurations for specific environments. E.g. for
`NODE_ENV=development` in **config/env/development/plugins.js**:

```js
module.exports = ({ env }) => ({
  email: {
    provider: 'nodemailer',
    providerOptions: {
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
    },
  },
});
```

The above setting is useful for local development with
[maildev](https://github.com/maildev/maildev).

### Custom authentication mechanisms

It is also possible to use custom authentication methods.
Here is an example for a NTLM authentication:

```js
const nodemailerNTLMAuth = require('nodemailer-ntlm-auth');

module.exports = ({ env }) => ({
  email: {
    provider: 'nodemailer',
    providerOptions: {
      host: env('SMTP_HOST', 'smtp.example.com'),
      port: env('SMTP_PORT', 587),
      auth: {
        type: 'custom',
        method: 'NTLM',
        user: env('SMTP_USERNAME'),
        pass: env('SMTP_PASSWORD'),
      },
      customAuth: {
        NTLM: nodemailerNTLMAuth,
      },
    },
    settings: {
      defaultFrom: 'hello@example.com',
      defaultReplyTo: 'hello@example.com',
    },
  },
});
```

## Usage

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

To send an email from anywhere inside Strapi:

```js
await strapi.plugins['email'].services.email.send({
  to: 'someone@example.com',
  from: 'someone2@example.com',
  subject: 'Hello world',
  text: 'Hello world',
  html: `<h4>Hello world</h4>`,
});
```

The following fields are supported:

| Field       | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| from        | Email address of the sender                                       |
| to          | Comma separated list or an array of recipients                    |
| replyTo     | Email address to which replies are sent                           |
| cc          | Comma separated list or an array of recipients                    |
| bcc         | Comma separated list or an array of recipients                    |
| subject     | Subject of the email                                              |
| text        | Plaintext version of the message                                  |
| html        | HTML version of the message                                       |
| attachments | Array of objects See: https://nodemailer.com/message/attachments/ |

## Troubleshooting

Check your firewall to ensure that requests are allowed. If it doesn't work with

```js
port: 465,
secure: true
```

try using

```js
port: 587,
secure: false
```

to test if it works correctly.
