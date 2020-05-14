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

| Variable       | Type                    | Description                                    | Required | Default   |
| -------------- | ----------------------- | ---------------------------------------------- | -------- | --------- |
| name           | string                  | The name of the provider you use               | yes      |           |
| apiKey         | string                  | Api key given by Mailgun                       | yes      |           |
| enabled        | boolean                 | Enable the possibility to send emails          | no       | true      |
| defaultFrom    | string                  | Sender mail address                            | no       | undefined |
| defaultReplyTo | string \| array<string> | Address or addresses the receiver can reply to | no       | undefined |
| host           | string                  |                                                |          |           |
| domain         | string                  |                                                |          |           |

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    name: 'mailgun',
    apiKey: env('MAILGUN_API_KEY'),
    defaultFrom: 'myemail@protonmail.com',
    defaultReplyTo: 'myemail@protonmail.com',
  },
  // ...
});
```
