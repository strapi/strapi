# @strapi/provider-email-nodemailer

A feature-rich Nodemailer email provider for Strapi with support for DKIM, OAuth2, connection pooling, calendar invitations, newsletters, and more.

## Features

| Category           | Features                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| **Sending**        | Priority, custom headers, attachments, embedded images, AMP4Email              |
| **Security**       | DKIM signing, OAuth2, requireTLS, file/URL access restrictions                 |
| **Performance**    | Connection pooling, rate limiting                                              |
| **Deliverability** | List-Unsubscribe headers (Gmail/Outlook), DSN bounce tracking, custom envelope |
| **Rich Content**   | Calendar invitations (iCalendar), AMP4Email interactive emails                 |
| **Connectivity**   | SOCKS/HTTP proxy support, NTLM and custom auth mechanisms                      |
| **Utilities**      | RFC 5322/2047/6531 email address parsing and formatting                        |

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

| Field       | Description                                                               |
| ----------- | ------------------------------------------------------------------------- |
| from        | Email address of the sender                                               |
| to          | Comma separated list or an array of recipients                            |
| replyTo     | Email address to which replies are sent                                   |
| cc          | Comma separated list or an array of recipients                            |
| bcc         | Comma separated list or an array of recipients                            |
| subject     | Subject of the email                                                      |
| text        | Plaintext version of the message                                          |
| html        | HTML version of the message                                               |
| attachments | Array of objects See: https://nodemailer.com/message/attachments/         |
| priority    | Email priority: `'high'`, `'normal'`, or `'low'` - sets X-Priority header |
| headers     | Custom SMTP headers object (e.g. `{ 'X-Custom': 'value' }`)               |
| icalEvent   | Calendar event invitation (iCalendar format)                              |
| list        | RFC 2369 List-\* headers - enables one-click unsubscribe in Gmail/Outlook |
| dsn         | Delivery Status Notification - request bounce/success reports             |
| envelope    | Custom SMTP envelope for bounce handling (MAIL FROM / RCPT TO)            |
| amp         | AMP4Email content for interactive emails                                  |
| auth        | Per-message OAuth2 credentials for multi-user sending                     |

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

### Newsletter with List-Unsubscribe

When sending newsletters, include List-Unsubscribe headers so Gmail and Outlook show a one-click "Unsubscribe" button:

```js
await strapi
  .plugin('email')
  .service('email')
  .send({
    to: 'subscriber@example.com',
    subject: 'Weekly Newsletter',
    html: '<h1>This week in tech...</h1>',
    list: {
      unsubscribe: {
        url: 'https://example.com/unsubscribe?id=123',
        comment: 'Unsubscribe',
      },
      help: 'support@example.com?subject=help',
    },
  });
```

### Delivery Status Notifications (DSN)

Request bounce reports or delivery confirmations:

```js
await strapi
  .plugin('email')
  .service('email')
  .send({
    to: 'someone@example.com',
    subject: 'Important document',
    text: 'Please confirm receipt',
    dsn: {
      id: 'msg-unique-123',
      return: 'headers',
      notify: ['success', 'failure'],
      recipient: 'bounce-handler@example.com',
    },
  });
```

### Custom SMTP Envelope (Bounce Handling)

Control the MAIL FROM address independently from the visible From header, useful for tracking bounces:

```js
await strapi
  .plugin('email')
  .service('email')
  .send({
    from: 'Newsletter <newsletter@example.com>',
    to: 'subscriber@example.com',
    subject: 'Newsletter',
    text: 'Hello!',
    envelope: {
      from: 'bounce+subscriber=example.com@example.com',
      to: 'subscriber@example.com',
    },
  });
```

### AMP4Email (Interactive Emails)

Send interactive AMP-powered emails (supported by Gmail):

```js
await strapi
  .plugin('email')
  .service('email')
  .send({
    to: 'someone@example.com',
    subject: 'Interactive Email',
    text: 'Fallback for non-AMP clients',
    html: '<p>Fallback for non-AMP clients</p>',
    amp: `<!doctype html>
<html ⚡4email>
  <head>
    <meta charset="utf-8">
    <style amp4email-boilerplate>body{visibility:hidden}</style>
    <script async src="https://cdn.ampproject.org/v0.js"></script>
  </head>
  <body>
    <p>This is an interactive AMP email!</p>
  </body>
</html>`,
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

#### Per-message OAuth2 (multi-user)

You can send emails on behalf of different users through a single transporter. Configure the transporter with shared OAuth2 credentials, then pass user-specific tokens per message:

```js
// config/plugins.js - shared transporter with OAuth2
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
          clientId: env('OAUTH_CLIENT_ID'),
          clientSecret: env('OAUTH_CLIENT_SECRET'),
        },
      },
      settings: {
        defaultFrom: 'noreply@example.com',
        defaultReplyTo: 'support@example.com',
      },
    },
  },
});
```

```js
// Send as a specific user
await strapi
  .plugin('email')
  .service('email')
  .send({
    to: 'recipient@example.com',
    subject: 'Hello from user',
    text: 'Sent on behalf of a specific user',
    auth: {
      user: 'specific-user@gmail.com',
      refreshToken: userRefreshToken,
      accessToken: userAccessToken,
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

### Rate limiting

Limit the number of emails sent per time interval to avoid being flagged as spam:

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
        rateDelta: 1000, // Time interval in ms (1 second)
        rateLimit: 5, // Max messages per rateDelta interval
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

### Proxy support

Route SMTP connections through a SOCKS or HTTP proxy:

```js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST'),
        port: 465,
        secure: true,
        proxy: env('SMTP_PROXY', 'socks5://127.0.0.1:1080'), // or 'http://proxy:3128'
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

For SOCKS proxy, install the `socks` package: `yarn add socks`.

### Require TLS

Force TLS encryption and refuse to send if the server doesn't support it:

```js
providerOptions: {
  host: env('SMTP_HOST'),
  port: 587,
  requireTLS: true, // Fail if STARTTLS is not available
  auth: { user: env('SMTP_USERNAME'), pass: env('SMTP_PASSWORD') },
},
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

## Email Address Utilities

This package includes RFC-compliant utilities for parsing and formatting email addresses.

### Import

```js
import {
  parseEmailAddress,
  formatEmailAddress,
  parseMultipleEmailAddresses,
  isValidEmail,
  decodeRfc2047,
  encodeRfc2047Base64,
} from '@strapi/provider-email-nodemailer/utils';
```

### Parsing Email Addresses

Parse email addresses in various RFC 5322 formats:

```js
// Simple email
parseEmailAddress('test@example.com');
// { name: null, email: 'test@example.com', original: '...' }

// Name with angle brackets
parseEmailAddress('John Doe <john@example.com>');
// { name: 'John Doe', email: 'john@example.com', original: '...' }

// Quoted name (RFC 5322)
parseEmailAddress('"Doe, John" <john@example.com>');
// { name: 'Doe, John', email: 'john@example.com', original: '...' }

// RFC 2047 encoded name (non-ASCII characters)
parseEmailAddress('=?UTF-8?B?TcO8bGxlcg==?= <mueller@example.com>');
// { name: 'Müller', email: 'mueller@example.com', original: '...' }

// Comment format (RFC 5322)
parseEmailAddress('support@example.com (Support Team)');
// { name: 'Support Team', email: 'support@example.com', original: '...' }
```

### Formatting Email Addresses

Create properly formatted email address strings:

```js
// Simple format
formatEmailAddress('John Doe', 'john@example.com');
// 'John Doe <john@example.com>'

// Auto-quotes special characters
formatEmailAddress('Doe, John', 'john@example.com');
// '"Doe, John" <john@example.com>'

// Auto-encodes non-ASCII characters (RFC 2047)
formatEmailAddress('Müller', 'mueller@example.com');
// '=?UTF-8?B?TcO8bGxlcg==?= <mueller@example.com>'

// Skip encoding if needed
formatEmailAddress('Müller', 'mueller@example.com', { encodeNonAscii: false });
// 'Müller <mueller@example.com>'
```

### Multiple Addresses

Parse comma-separated email addresses (handles quoted strings with commas):

```js
parseMultipleEmailAddresses('a@example.com, "Doe, John" <b@example.com>');
// [
//   { name: null, email: 'a@example.com', ... },
//   { name: 'Doe, John', email: 'b@example.com', ... }
// ]
```

### RFC 2047 Encoding/Decoding

Handle MIME encoded-words for non-ASCII characters:

```js
// Decode Base64 or Quoted-Printable
decodeRfc2047('=?UTF-8?B?U3RyYXBp?=');
// 'Strapi'

decodeRfc2047('=?UTF-8?Q?M=C3=BCller?=');
// 'Müller'

// Encode for MIME headers
encodeRfc2047Base64('Müller');
// '=?UTF-8?B?TcO8bGxlcg==?='
```

### Validation

```js
isValidEmail('user@example.com'); // true
isValidEmail('invalid'); // false
```

### Supported RFC Standards

| RFC      | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| RFC 5322 | Internet Message Format (name <email>, quoted strings, comments) |
| RFC 2047 | MIME encoded-words (=?charset?encoding?text?=)                   |
| RFC 6531 | Internationalized Email (UTF-8 in addresses)                     |

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
