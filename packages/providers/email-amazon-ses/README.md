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

| Variable                | Type                    | Description                                                                                                                                                                                                              | Required | Default   |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------- |
| provider                | string                  | The name of the provider you use                                                                                                                                                                                         | yes      |           |
| providerOptions         | object                  | Configuration options for the AWS SES client. See [AWS SDK v3 SESClientConfig](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-ses/Interface/SESClientConfig/) for all available options. | yes      |           |
| settings                | object                  | Settings                                                                                                                                                                                                                 | no       | {}        |
| settings.defaultFrom    | string                  | Default sender mail address                                                                                                                                                                                              | no       | undefined |
| settings.defaultReplyTo | string \| array<string> | Default address or addresses the receiver is asked to reply to                                                                                                                                                           | no       | undefined |

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

### Legacy Configuration (Deprecated)

For backward compatibility, the provider still supports the legacy configuration format:

```js
providerOptions: {
  key: env('AWS_SES_KEY'),
  secret: env('AWS_SES_SECRET'),
  amazon: 'https://email.us-east-1.amazonaws.com',
}
```

However, it's recommended to use the modern AWS SDK v3 configuration format shown above.

### Example

**Path -** `./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'amazon-ses',
      providerOptions: {
        region: env('AWS_SES_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: env('AWS_SES_KEY'),
          secretAccessKey: env('AWS_SES_SECRET'),
        },
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
