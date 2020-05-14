# strapi-provider-email-mailgun

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
yarn add strapi-provider-email-mailgun

# using npm
npm install strapi-provider-email-mailgun --save
```

## Configuration

| Variable                       | Type                    | Description                                    | Required | Default   |
| ------------------------------ | ----------------------- | ---------------------------------------------- | -------- | --------- |
| provider                       | string                  | The name of the provider you use               | yes      |           |
| providerOptions.apiKey         | string                  | Api key given by Mailgun                       | yes      |           |
| providerOptions.defaultFrom    | string                  | Sender mail address                            | no       | undefined |
| providerOptions.defaultReplyTo | string \| array<string> | Address or addresses the receiver can reply to | no       | undefined |
| providerOptions.host           | string                  |                                                |          |           |
| providerOptions.domain         | string                  |                                                |          |           |

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'mailgun',
    providerOptions: {
      apiKey: env('MAILGUN_API_KEY'),
      defaultFrom: 'myemail@protonmail.com',
      defaultReplyTo: 'myemail@protonmail.com',
    },
  },
  // ...
});
```
