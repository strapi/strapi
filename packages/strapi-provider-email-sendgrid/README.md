# strapi-provider-email-sendgrid

---

## Deprecation Warning :warning:

Hello! We have some news to share,

We’ve decided it’ll soon be time to end the support for `strapi-provider-email-sendgrid`.

After years of iterations, Strapi is going to V4 and we won’t maintain V3 packages when it’ll reach its end-of-support milestone (~end of Q3 2022).

If you’ve been using `strapi-provider-email-sendgrid` and have migrated to V4 (or if you want to), you can find the equivalent and updated version of this package at this [URL](https://github.com/strapi/strapi/tree/master/packages/providers/email-sendgrid) and with the following name on NPM: `@strapi/provider-email-sendgrid`.

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

You need to have the plugin `strapi-plugin-email` installed in you Strapi project.

## Installation

```bash
# using yarn
yarn add strapi-provider-email-sendgrid

# using npm
npm install strapi-provider-email-sendgrid --save
```

## Configuration

| Variable                | Type                    | Description                                                                                                             | Required | Default   |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| provider                | string                  | The name of the provider you use                                                                                        | yes      |           |
| providerOptions         | object                  | Provider options                                                                                                        | yes      |           |
| providerOptions.apiKey  | object                  | Api key given to the function setApiKey. Please refer to [@sendgrid/mail](https://www.npmjs.com/package/@sendgrid/mail) | yes      |           |
| settings                | object                  | Settings                                                                                                                | no       | {}        |
| settings.defaultFrom    | string                  | Default sender mail address                                                                                             | no       | undefined |
| settings.defaultReplyTo | string \| array<string> | Default address or addresses the receiver is asked to reply to                                                          | no       | undefined |

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'sendgrid',
    providerOptions: {
      apiKey: env('SENDGRID_API_KEY'),
    },
    settings: {
      defaultFrom: 'myemail@protonmail.com',
      defaultReplyTo: 'myemail@protonmail.com',
    },
  },
  // ...
});
```
