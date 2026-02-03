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

| Variable                | Type                    | Description                                                    | Required | Default     |
| ----------------------- | ----------------------- | -------------------------------------------------------------- | -------- | ----------- |
| provider                | string                  | The name of the provider you use                               | yes      |             |
| providerOptions         | object                  | Provider options (see examples below)                          | yes      |             |
| providerOptions.region  | string                  | AWS region for SES                                             | no       | `us-east-1` |
| settings                | object                  | Settings                                                       | no       | {}          |
| settings.defaultFrom    | string                  | Default sender mail address                                    | no       | undefined   |
| settings.defaultReplyTo | string \| array<string> | Default address or addresses the receiver is asked to reply to | no       | undefined   |

> :warning: The Shipper Email (or defaultfrom) may also need to be changed in the `Email Templates` tab on the admin panel for emails to send properly

### Example: Using IAM Roles (Recommended for AWS deployments)

When running on AWS infrastructure (EC2, ECS, Lambda, etc.), credentials are automatically resolved from the instance's IAM role. This is the recommended approach for production deployments.

**Path -** `./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  email: {
    config: {
      provider: 'amazon-ses',
      providerOptions: {
        region: env('AWS_REGION', 'us-east-1'),
        // No credentials needed - uses IAM role automatically
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

The AWS SDK automatically resolves credentials in the following order:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM roles for Amazon EC2/ECS/Lambda

### Example: Using Explicit Credentials

If you need to provide credentials explicitly (e.g., for local development or non-AWS environments):

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

### Example: Legacy Configuration (Backwards Compatible)

The legacy configuration format using `key`, `secret`, and `amazon` options is still supported for backwards compatibility:

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
