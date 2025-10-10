# @strapi/provider-email-mailgun

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
yarn add @strapi/provider-email-mailgun

# using npm
npm install @strapi/provider-email-mailgun --save
```

## Configuration

| Variable                | Type                    | Description                                                                                                                        | Required | Default   |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| provider                | string                  | The name of the provider you use                                                                                                   | yes      |           |
| providerOptions         | object                  | Will be directly given to the `require('mailgun.js')`. Please refer to [mailgun.js](https://www.npmjs.com/package/mailgun.js) doc. | yes      |           |
| settings                | object                  | Settings                                                                                                                           | no       | {}        |
| settings.defaultFrom    | string                  | Default sender mail address                                                                                                        | no       | undefined |
| settings.defaultReplyTo | string \| array<string> | Default address or addresses the receiver is asked to reply to                                                                     | no       | undefined |

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

Since [mailgun-js](https://www.npmjs.com/package/mailgun-js) has been deprecated, this package now uses `mailgun.js` instead. In an effort to avoid breaking changes methods were added to convert existing configuration objects to work with the new package.

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'mailgun',
      providerOptions: {
        key: env('MAILGUN_API_KEY'), // Required
        domain: env('MAILGUN_DOMAIN'), // Required
        url: env('MAILGUN_URL', 'https://api.mailgun.net'), //Optional. If domain region is Europe use 'https://api.eu.mailgun.net'
      },
      settings: {
        defaultFrom: 'myemail@protonmail.com',
        defaultReplyTo: 'myemail@protonmail.com',
      },
    },
  },
  // ...
});
```
