# strapi-provider-email-sendmail

## Resources

- [License](LICENSE)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)

## Prerequisites

You need to have the plugin `strapi-plugin-email` installed in you Strapi project.

## Installation

```bash
# using yarn
yarn add strapi-provider-email-sendmail

# using npm
npm install strapi-provider-email-sendmail --save
```

## Configuration

| Variable                | Type                    | Description                                                                                                              | Required | Default   |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------- | --------- |
| provider                | string                  | The name of the provider you use                                                                                         | yes      |           |
| providerOptions         | object                  | Will be directly given to `require('sendmail')`. Please refer to [sendmail](https://www.npmjs.com/package/sendmail) doc. | no       | {}        |
| settings                | object                  | Settings                                                                                                                 | no       | {}        |
| settings.defaultFrom    | string                  | Default sender mail address                                                                                              | no       | undefined |
| settings.defaultReplyTo | string \| array<string> | Default address or addresses the receiver is asked to reply to                                                           | no       | undefined |
| providerOptions.dkim    | object  \| boolean      | DKIM parameters having two properties: { privateKey, keySelector }                                                       | no       | false |

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'sendmail',
    settings: {
      defaultFrom: 'myemail@protonmail.com',
      defaultReplyTo: 'myemail@protonmail.com',
    },
  },
  // ...
});
```

### Example with DKIM

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
      }
    },
    settings: {
      defaultFrom: 'myemail@protonmail.com',
      defaultReplyTo: 'myemail@protonmail.com',
    },
  },
  // ...
});
```
