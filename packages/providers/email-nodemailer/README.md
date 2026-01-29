# @strapi/provider-email-nodemailer

## Resources

- [LICENSE](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi documentation](https://docs.strapi.io)
- [Strapi community on Discord](https://discord.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)

## Installation

```bash
# using yarn
yarn add @strapi/provider-email-nodemailer

# using npm
npm install @strapi/provider-email-nodemailer --save
```

## Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
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
  },
  // ...
});
```

Check out the available options for nodemailer: https://nodemailer.com/about/

### Development mode

You can override the default configurations for specific environments. E.g. for
`NODE_ENV=development` in **config/env/development/plugins.js**:

```js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: 'localhost',
        port: 1025,
        ignoreTLS: true,
      },
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
    config: {
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
  },
});
```

## Usage

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

To send an email from anywhere inside Strapi:

```js
await strapi.plugin('email').service('email').send({
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
| priority    | Email priority: 'high', 'normal', or 'low'                        |
| headers     | Custom headers object                                             |
| icalEvent   | Calendar event invitation                                         |

All other [nodemailer message options](https://nodemailer.com/message/) are also supported.

### Sending with priority and custom headers

```js
await strapi
  .plugin('email')
  .service('email')
  .send({
    to: 'someone@example.com',
    subject: 'Urgent',
    text: 'Please respond ASAP',
    priority: 'high',
    headers: {
      'X-Custom-Header': 'my-value',
    },
  });
```

### Calendar invitations

```js
await strapi
  .plugin('email')
  .service('email')
  .send({
    to: 'someone@example.com',
    subject: 'Meeting Invitation',
    text: 'You are invited to a meeting',
    icalEvent: {
      method: 'REQUEST',
      content: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260130T100000Z
DTEND:20260130T110000Z
SUMMARY:Team Meeting
END:VEVENT
END:VCALENDAR`,
    },
  });
```

### Embedded images

```js
await strapi
  .plugin('email')
  .service('email')
  .send({
    to: 'someone@example.com',
    subject: 'Newsletter',
    html: '<p>Logo: <img src="cid:logo@company"/></p>',
    attachments: [
      {
        filename: 'logo.png',
        path: '/path/to/logo.png',
        cid: 'logo@company',
      },
    ],
  });
```

## Advanced configuration

### OAuth2 authentication

For services like Gmail or Outlook, you can use OAuth2 instead of passwords:

```js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: env('SMTP_USER'),
          clientId: env('OAUTH_CLIENT_ID'),
          clientSecret: env('OAUTH_CLIENT_SECRET'),
          refreshToken: env('OAUTH_REFRESH_TOKEN'),
        },
      },
      settings: {
        defaultFrom: env('SMTP_USER'),
        defaultReplyTo: env('SMTP_USER'),
      },
    },
  },
});
```

See [nodemailer OAuth2 documentation](https://nodemailer.com/smtp/oauth2/) for details.

### Connection pooling

For better performance when sending multiple emails:

```js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: 465,
        secure: true,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: 'hello@example.com',
        defaultReplyTo: 'hello@example.com',
      },
    },
  },
});
```

### DKIM signing

Add DKIM signatures to improve email deliverability:

```js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: 587,
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
        dkim: {
          domainName: 'example.com',
          keySelector: 'mail',
          privateKey: env('DKIM_PRIVATE_KEY'),
        },
      },
      settings: {
        defaultFrom: 'hello@example.com',
        defaultReplyTo: 'hello@example.com',
      },
    },
  },
});
```

### Security options

When processing emails from untrusted sources, you can restrict file and URL access:

```js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: 587,
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
        disableFileAccess: true,
        disableUrlAccess: true,
      },
      settings: {
        defaultFrom: 'hello@example.com',
        defaultReplyTo: 'hello@example.com',
      },
    },
  },
});
```

## Provider methods

### verify

Verify your SMTP configuration without sending an email:

```js
const emailProvider = strapi.plugin('email').provider;

try {
  await emailProvider.verify();
  console.log('SMTP connection is working');
} catch (error) {
  console.error('SMTP configuration error:', error.message);
}
```

This tests DNS resolution, TCP connection, TLS upgrade (if applicable), and authentication.

### isIdle

Check if the transporter has available capacity (useful with connection pooling):

```js
if (emailProvider.isIdle()) {
  // Safe to send more emails
}
```

### close

Close all connections gracefully (recommended when using connection pooling):

```js
// On application shutdown
emailProvider.close();
```

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
