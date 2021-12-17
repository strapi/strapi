# @strapi/provider-email-amazon-ses

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
yarn add @strapi/provider-email-amazon-ses

# using npm
npm install @strapi/provider-email-amazon-ses --save
```

## Configuration

| Variable                | Type             | Description                                                                                                                                                       | Required | Default   |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- |
| provider                | string           | The name of the provider you use                                                                                                                                  | yes      |           |
| providerOptions         | object           | Will be directly given to `aws.SES` object. Please refer to [AWS SES](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SES.html#constructor-property) doc. | yes      |           |
| settings                | object           | Settings                                                                                                                                                          | no       | {}        |
| settings.defaultFrom    | string           | Default sender mail address                                                                                                                                       | no       | undefined |
| settings.defaultReplyTo | string, string[] | Default address or addresses the receiver is asked to reply to                                                                                                    | no       | undefined |

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

## Callback

| Variable  | Type   | Description                                    |
| --------- | ------ | ---------------------------------------------- |
| messageId | string | The Message-ID of the email that was just sent |

### Example

**Path -** `./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'amazon-ses',
      providerOptions: {
        key: env('AWS_SES_KEY'),
        secret: env('AWS_SES_SECRET'),
        region: 'us-east-1',
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
