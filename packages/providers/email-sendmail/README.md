# @strapi/provider-email-sendmail

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
yarn add @strapi/provider-email-sendmail

# using npm
npm install @strapi/provider-email-sendmail --save
```

## Configuration

This provider implements the same **direct SMTP delivery** model as the historical `sendmail` npm package (MX lookup per recipient domain, optional DKIM, development mode to target a local SMTP capture server). It uses **Nodemailer** for MIME generation and SMTP transport instead of the unmaintained `sendmail` / `mailcomposer` stack.

| Variable                 | Type              | Description                                                                                                                                                                                      | Required | Default   |
| ------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------- |
| provider                 | string            | The name of the provider you use                                                                                                                                                                 | yes      |           |
| providerOptions          | object            | Options below (same names as the legacy `sendmail` package where applicable).                                                                                                                    | no       | {}        |
| settings                 | object            | Settings                                                                                                                                                                                         | no       | {}        |
| settings.defaultFrom     | string            | Default sender mail address                                                                                                                                                                      | no       | undefined |
| settings.defaultReplyTo  | string \| array   | Default address or addresses the receiver is asked to reply to                                                                                                                                   | no       | undefined |
| providerOptions.dkim     | object \| boolean | DKIM parameters: `{ privateKey, keySelector? }` (passed to Nodemailer’s DKIM signing).                                                                                                           | no       | false     |
| providerOptions.silent   | boolean           | Suppress default console logging from the provider (default merged to `true` unless overridden).                                                                                                 | no       | (merged)  |
| providerOptions.devPort  | number            | If set to a **positive** port, delivery targets `devHost:devPort` instead of performing MX DNS (e.g. MailHog / local test SMTP). **The connection uses this port** (same as the legacy package). | no       | -1        |
| providerOptions.devHost  | string            | Host for development mode (default `localhost`).                                                                                                                                                 | no       | localhost |
| providerOptions.smtpPort | number            | Outbound SMTP port when **not** in `devPort` mode (default **25**).                                                                                                                              | no       | 25        |
| providerOptions.smtpHost | string            | Extra hostname tried after MX records for each domain (legacy behavior).                                                                                                                         | no       | -1        |

MIME is now produced with **Nodemailer** instead of the old `mailcomposer` stack, so the raw message may not match the legacy package byte-for-byte; routing and documented `providerOptions` stay the same.

You can pass through **additional Nodemailer mail fields** on each `send()` (for example `headers`, `messageId`, `textEncoding`, `priority`) if you need finer control.

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'sendmail',
      settings: {
        defaultFrom: 'myemail@protonmail.com',
        defaultReplyTo: 'myemail@protonmail.com',
      },
    },
  },
  // ...
});
```

### Example with DKIM

Using **DKIM** (DomainKeys Identified Mail) can prevent emails from being considered as spam. More details about this subject can be found in the discussion on the Strapi forum: [Unsolved problem: emails goes to spam!](https://forum.strapi.io/t/unsolved-problem-emails-goes-to-spam/512?u=soringfs)

#### Generate the keys using OpenSSL

```perl
openssl genrsa -out dkim-private.pem 1024
openssl rsa -in dkim-private.pem -pubout -out dkim-public.pem
```

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'sendmail',
    providerOptions: {
      dkim: {
        privateKey: 'replace-with-dkim-private-key',
        keySelector: 'abcd', // the same as the one set in DNS txt record, use online dns lookup tools to be sure that is retreivable
      },
    },
    settings: {
      defaultFrom: 'myemail@protonmail.com',
      defaultReplyTo: 'myemail@protonmail.com',
    },
  },
  // ...
});
```
