# strapi-provider-email-sendmail

## Resources

- [MIT License](LICENSE.md)

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

| Variable                       | Type                    | Description                                    | Required | Default   |
| ------------------------------ | ----------------------- | ---------------------------------------------- | -------- | --------- |
| provider                       | string                  | The name of the provider you use               | yes      |           |
| providerOptions.defaultFrom    | string                  | Sender mail address                            | no       | undefined |
| providerOptions.defaultReplyTo | string \| array<string> | Address or addresses the receiver can reply to | no       | undefined |

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'sendmail',
    providerOptions: {
      defaultFrom: 'myemail@protonmail.com',
      defaultReplyTo: 'myemail@protonmail.com',
    },
  },
  // ...
});
```
