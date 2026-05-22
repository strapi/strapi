# @strapi/provider-upload-aws-s3

## Resources

- [LICENSE](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi documentation](https://docs.strapi.io/cms/configurations/media-library-providers/amazon-s3)
- [Strapi community on Discord](https://discord.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)

## Installation

```bash
# using yarn
yarn add @strapi/provider-upload-aws-s3

# using npm
npm install @strapi/provider-upload-aws-s3 --save
```

## Configuration

- `provider` defines the name of the provider
- `providerOptions` is passed down during the construction of the provider. (ex: `new AWS.S3(config)`). [Complete list of options](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property)
- `providerOptions.params` is passed directly to the parameters to each method respectively.
  - `ACL` is the access control list for the object. Defaults to `public-read`.
  - `signedUrlExpires` is the number of seconds before a signed URL expires. (See [how signed URLs work](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html)). Defaults to 15 minutes and URLs are only signed when ACL is set to `private`.
  - `Bucket` is the name of the bucket to upload to.
- `providerOptions.providerConfig` contains extended configuration options (see below).
- `actionOptions` is passed directly to the parameters to each method respectively. You can find the complete list of [upload/ uploadStream options](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property) and [delete options](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property)

See the [documentation about using a provider](https://docs.strapi.io/developer-docs/latest/plugins/upload.html#using-a-provider) for information on installing and using a provider. To understand how environment variables are used in Strapi, please refer to the [documentation about environment variables](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#environment-variables).

If you're using the bucket as a CDN and deliver the content on a custom domain, you can get use of the `baseUrl` and `rootPath` properties to configure how your assets' urls will be saved inside Strapi.

### Basic Provider Configuration

`./config/plugins.js` or `./config/plugins.ts` for TypeScript projects:

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('CDN_URL'),
        rootPath: env('CDN_ROOT_PATH'),
        s3Options: {
          credentials: {
            accessKeyId: env('AWS_ACCESS_KEY_ID'),
            secretAccessKey: env('AWS_ACCESS_SECRET'),
          },
          region: env('AWS_REGION'),
          params: {
            ACL: env('AWS_ACL', 'public-read'),
            signedUrlExpires: env('AWS_SIGNED_URL_EXPIRES', 15 * 60),
            Bucket: env('AWS_BUCKET'),
          },
        },
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  // ...
});
```

## Extended Provider Configuration

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        baseUrl: env('CDN_URL'),
        rootPath: env('CDN_ROOT_PATH'),
        s3Options: {
          credentials: {
            accessKeyId: env('AWS_ACCESS_KEY_ID'),
            secretAccessKey: env('AWS_ACCESS_SECRET'),
          },
          region: env('AWS_REGION'),
          params: {
            ACL: 'private',
            signedUrlExpires: 15 * 60,
            Bucket: env('AWS_BUCKET'),
          },
        },
        providerConfig: {
          checksumAlgorithm: 'CRC64NVME',
          preventOverwrite: true,
          storageClass: 'INTELLIGENT_TIERING',
          encryption: {
            type: 'aws:kms',
            kmsKeyId: env('AWS_KMS_KEY_ID'),
          },
          tags: {
            application: 'strapi',
            environment: env('NODE_ENV'),
          },
          multipart: {
            partSize: 10 * 1024 * 1024,
            queueSize: 4,
          },
        },
      },
    },
  },
});
```

Many additional configuration options and best practices are described in the [official documentation](https://docs.strapi.io//cms/configurations/media-library-providers/amazon-s3)
