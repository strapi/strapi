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

| Variable                | Type                    | Description                                                                                                                          | Required | Default   |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------- |
| provider                | string                  | The name of the provider you use                                                                                                     | yes      |           |
| providerOptions         | object                  | Passed to the AWS SDK v3 `SESClient` constructor. Supports `region`, `endpoint`, and AWS SDK credential resolution (including IRSA). | yes      |           |
| settings                | object                  | Settings                                                                                                                             | no       | {}        |
| settings.defaultFrom    | string                  | Default sender mail address                                                                                                          | no       | undefined |
| settings.defaultReplyTo | string \| array<string> | Default address or addresses the receiver is asked to reply to                                                                       | no       | undefined |

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

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
          key: env('AWS_SES_KEY'),
          secret: env('AWS_SES_SECRET'),
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

**Path -** `.env`

```env
AWS_SES_KEY=
AWS_SES_SECRET=
AWS_SES_REGION=
```

### IRSA (EKS)

When running in EKS with IAM Roles for Service Accounts (IRSA), omit static credentials and provide only the region.

```js
module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'amazon-ses',
      providerOptions: {
        region: env('AWS_SES_REGION', 'us-east-1'),
      },
      settings: {
        defaultFrom: 'myemail@protonmail.com',
        defaultReplyTo: 'myemail@protonmail.com',
      },
    },
  },
});
```

The AWS SDK v3 default credential provider chain will resolve IRSA credentials from the environment.
