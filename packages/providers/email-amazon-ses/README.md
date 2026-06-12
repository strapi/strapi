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

| Variable                | Type                    | Description                                                           | Required | Default     |
| ----------------------- | ----------------------- | --------------------------------------------------------------------- | -------- | ----------- |
| provider                | string                  | The name of the provider you use                                      | yes      |             |
| providerOptions         | object                  | Passed to the AWS SDK v3 `SESClient` constructor (see examples below) | yes      |             |
| providerOptions.region  | string                  | AWS region for SES                                                    | no       | `us-east-1` |
| settings                | object                  | Settings                                                              | no       | {}          |
| settings.defaultFrom    | string                  | Default sender mail address                                           | no       | undefined   |
| settings.defaultReplyTo | string \| array<string> | Default address or addresses the receiver is asked to reply to        | no       | undefined   |

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

### Example: Using IAM roles (recommended for AWS deployments)

When running on AWS infrastructure (EC2, ECS, EKS, Lambda, etc.), credentials are resolved from the instance or task IAM role. No access keys are required in configuration.

**Path -** `./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'amazon-ses',
      providerOptions: {
        region: env('AWS_REGION', 'us-east-1'),
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
AWS_REGION=us-east-1
```

The AWS SDK resolves credentials in this order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM roles for Amazon EC2 / ECS / EKS (including IRSA)

### Example: Using explicit credentials

For local development or non-AWS environments:

**Path -** `./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'amazon-ses',
      providerOptions: {
        region: env('AWS_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
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
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
```

### Example: Legacy configuration (backwards compatible)

The legacy `node-ses` format using `key`, `secret`, and `amazon` is still supported. The provider maps these to AWS SDK v3 options (`credentials`, `endpoint`, and `region` parsed from the `amazon` URL).

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
        amazon: `https://email.${env('AWS_SES_REGION', 'us-east-1')}.amazonaws.com`,
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
AWS_SES_KEY=your-access-key-id
AWS_SES_SECRET=your-secret-access-key
AWS_SES_REGION=us-east-1
```

You may also use `credentials: { key, secret }` with `region` instead of top-level `key` / `secret`.
