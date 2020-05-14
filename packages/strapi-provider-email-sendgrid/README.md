# strapi-provider-email-sendgrid

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
yarn add strapi-provider-email-sendgrid

# using npm
npm install strapi-provider-email-sendgrid --save
```

## Configuration

| Variable       | Type                    | Description                                    | Required | Default   |
| -------------- | ----------------------- | ---------------------------------------------- | -------- | --------- |
| name           | string                  | The name of the provider you use               | yes      |           |
| apiKey         | string                  | Api key given by Sendgrid                      | yes      |           |
| enabled        | boolean                 | Enable the possibility to send emails          | no       | true      |
| defaultFrom    | string                  | Sender mail address                            | no       | undefined |
| defaultReplyTo | string \| array<string> | Address or addresses the receiver can reply to | no       | undefined |

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    name: 'sendgrid',
    apiKey: env('SENDGRID_API_KEY'),
    defaultFrom: 'myemail@protonmail.com',
    defaultReplyTo: 'myemail@protonmail.com',
  },
  // ...
});
```
