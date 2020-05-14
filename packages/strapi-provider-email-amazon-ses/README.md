# strapi-provider-email-amazon-ses

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
yarn add strapi-provider-email-amazon-ses

# using npm
npm install strapi-provider-email-amazon-ses --save
```

## Configuration

| Variable                       | Type                    | Description                                    | Required | Default                                 |
| ------------------------------ | ----------------------- | ---------------------------------------------- | -------- | --------------------------------------- |
| provider                       | string                  | The name of the provider you use               | yes      |                                         |
| providerOptions.key            | string                  | Api key given by Amazon SES                    | yes      |                                         |
| providerOptions.secret         | string                  | Secret given by Amazon SES                     | yes      |                                         |
| providerOptions.defaultFrom    | string                  | Sender mail address                            | no       | undefined                               |
| providerOptions.defaultReplyTo | string \| array<string> | Address or addresses the receiver can reply to | no       | undefined                               |
| providerOptions.endpoint       | string                  | Amazon endpoint uri                            | no       | 'https://email.us-east-1.amazonaws.com' |

### Example

**Path -** `config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    provider: 'amazon-ses',
    providerOptions: {
      key: env('AWS_SES_KEY'),
      secret: env('AWS_SES_SECRET'),
      defaultFrom: 'myemail@protonmail.com',
      defaultReplyTo: 'myemail@protonmail.com',
      endpoint: 'https://email.us-east-1.amazonaws.com',
    },
  },
  // ...
});
```
