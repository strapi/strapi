# @strapi/provider-upload-aws-s3

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

### Provider Configuration

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

The `providerConfig` option provides additional features for data integrity, security, and cost optimization.

### Checksum Validation

Enable automatic checksum calculation to ensure data integrity during uploads. The SDK calculates a checksum on the client side, and S3 validates it server-side.

```js
providerOptions: {
  s3Options: { /* ... */ },
  providerConfig: {
    checksumAlgorithm: 'CRC64NVME', // Options: 'CRC32', 'CRC32C', 'SHA1', 'SHA256', 'CRC64NVME'
  },
},
```

`CRC64NVME` is recommended for best performance on modern hardware.

### Conditional Writes (Prevent Overwrites)

Prevent accidental file overwrites due to race conditions by enabling conditional writes. When enabled, uploads will fail if an object with the same key already exists.

```js
providerConfig: {
  preventOverwrite: true,
},
```

### Storage Class Configuration (AWS S3 only)

Optimize storage costs by specifying a storage class for uploaded objects. Use lower-cost classes for infrequently accessed data.

**Note:** Storage classes are AWS S3-specific. Other S3-compatible providers (MinIO, DigitalOcean Spaces, IONOS, Wasabi) will ignore this setting.

```js
providerConfig: {
  storageClass: 'INTELLIGENT_TIERING', // Auto-optimizes costs
},
```

Available storage classes (AWS S3):

- `STANDARD` - Frequently accessed data (default)
- `INTELLIGENT_TIERING` - Automatic cost optimization
- `STANDARD_IA` - Infrequently accessed data
- `ONEZONE_IA` - Infrequently accessed, single AZ
- `GLACIER` - Archive storage
- `DEEP_ARCHIVE` - Long-term archive
- `GLACIER_IR` - Glacier Instant Retrieval

### Server-Side Encryption

Configure server-side encryption for compliance requirements (GDPR, HIPAA, etc.).

```js
providerConfig: {
  encryption: {
    type: 'AES256', // S3-managed encryption
  },
},
```

For KMS-managed encryption (AWS S3 only):

```js
providerConfig: {
  encryption: {
    type: 'aws:kms',
    kmsKeyId: env('AWS_KMS_KEY_ID'),
  },
},
```

Available encryption types:

- `AES256` - S3-managed keys (SSE-S3) - supported by most S3-compatible providers
- `aws:kms` - AWS KMS-managed keys (SSE-KMS) - AWS S3 only
- `aws:kms:dsse` - Dual-layer SSE with KMS - AWS S3 only

### Object Tagging

Apply tags to uploaded objects for cost allocation, lifecycle policies, and organization.

```js
providerConfig: {
  tags: {
    project: 'website',
    environment: 'production',
    team: 'backend',
  },
},
```

### Multipart Upload Configuration

Configure multipart upload behavior for large files.

```js
providerConfig: {
  multipart: {
    partSize: 10 * 1024 * 1024, // 10MB per part
    queueSize: 4,               // Number of parallel uploads
    leavePartsOnError: false,   // Clean up on failure
  },
},
```

### Complete Configuration Example

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

### Configuration for a private S3 bucket and signed URLs

If your bucket is configured to be private, you will need to set the `ACL` option to `private` in the `params` object. This will ensure file URLs are signed.

**Note:** If you are using a CDN, the URLs will not be signed.

You can also define the expiration time of the signed URL by setting the `signedUrlExpires` option in the `params` object. The default value is 15 minutes.

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        credentials: {
          accessKeyId: env('AWS_ACCESS_KEY_ID'),
          secretAccessKey: env('AWS_ACCESS_SECRET'),
        },
        region: env('AWS_REGION'),
        params: {
          ACL: 'private', // <== set ACL to private
          signedUrlExpires: env('AWS_SIGNED_URL_EXPIRES', 15 * 60),
          Bucket: env('AWS_BUCKET'),
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

#### Configuration for S3 compatible services

This plugin works with S3-compatible services by using the `endpoint` option. The provider automatically constructs correct URLs for S3-compatible services that return incorrect `Location` formats for multipart uploads (e.g. IONOS, MinIO).

**Important:** Some providers require `forcePathStyle: true` in the `s3Options`. This is needed when the provider does not support virtual-hosted-style URLs (e.g. `bucket.endpoint.com`), and instead uses path-style URLs (e.g. `endpoint.com/bucket`).

| Provider            | `forcePathStyle` | `ACL`             | Notes                             |
| ------------------- | ---------------- | ----------------- | --------------------------------- |
| IONOS               | `true`           | Supported         | Multipart Location bug auto-fixed |
| MinIO               | `true`           | Supported         |                                   |
| Contabo             | `true`           | Supported         |                                   |
| Hetzner             | `true`           | Supported         |                                   |
| DigitalOcean Spaces | Not needed       | Supported         |                                   |
| Wasabi              | Not needed       | Supported         |                                   |
| Scaleway            | Not needed       | Supported         |                                   |
| Vultr               | Not needed       | Supported         |                                   |
| Backblaze B2        | Not needed       | Supported         |                                   |
| Cloudflare R2       | Not needed       | **Not supported** | Omit `ACL` from params            |

##### Scaleway example

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env('SCALEWAY_ACCESS_KEY_ID'),
            secretAccessKey: env('SCALEWAY_ACCESS_SECRET'),
          },
          region: env('SCALEWAY_REGION'), // e.g "fr-par"
          endpoint: env('SCALEWAY_ENDPOINT'), // e.g. "https://s3.fr-par.scw.cloud"
          params: {
            Bucket: env('SCALEWAY_BUCKET'),
          },
        },
      },
    },
  },
  // ...
});
```

##### IONOS / MinIO / Contabo example (forcePathStyle required)

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env('S3_ACCESS_KEY_ID'),
            secretAccessKey: env('S3_ACCESS_SECRET'),
          },
          region: env('S3_REGION'),
          endpoint: env('S3_ENDPOINT'),
          forcePathStyle: true, // Required for these providers
          params: {
            Bucket: env('S3_BUCKET'),
          },
        },
      },
    },
  },
});
```

##### Cloudflare R2 example (no ACL support)

```js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env('R2_ACCESS_KEY_ID'),
            secretAccessKey: env('R2_ACCESS_SECRET'),
          },
          region: 'auto',
          endpoint: env('R2_ENDPOINT'), // e.g. "https://<account-id>.r2.cloudflarestorage.com"
          params: {
            Bucket: env('R2_BUCKET'),
            // Do NOT set ACL - R2 does not support ACLs
          },
        },
      },
    },
  },
});
```

### Security Middleware Configuration

Due to the default settings in the Strapi Security Middleware you will need to modify the `contentSecurityPolicy` settings to properly see thumbnail previews in the Media Library. You should replace `strapi::security` string with the object bellow instead as explained in the [middleware configuration](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/middlewares.html#loading-order) documentation.

`./config/middlewares.js`

```js
module.exports = [
  // ...
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'yourBucketName.s3.yourRegion.amazonaws.com',
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'yourBucketName.s3.yourRegion.amazonaws.com',
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ...
];
```

If you use dots in your bucket name (`forcePathStyle set to false`), the url of the resource is in directory style (`s3.yourRegion.amazonaws.com/your.bucket.name/image.jpg`) instead of `yourBucketName.s3.yourRegion.amazonaws.com/image.jpg` so in that case the img-src and media-src directives to add will be `s3.yourRegion.amazonaws.com` without the bucket name in the url.

## Bucket CORS Configuration

If you are planning on uploading content like GIFs and videos to your S3 bucket, you will want to edit its CORS configuration so that thumbnails are properly shown in Strapi. To do so, open your Bucket on the AWS console and locate the _Cross-origin resource sharing (CORS)_ field under the _Permissions_ tab, then amend the policies by writing your own JSON configuration, or copying and pasting the following one:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["YOUR STRAPI URL"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3000
  }
]
```

## Required AWS Policy Actions

These are the minimum amount of permissions needed for this provider to work.

```json
"Action": [
  "s3:PutObject",
  "s3:GetObject",
  "s3:ListBucket",
  "s3:DeleteObject",
  "s3:PutObjectAcl"
],
```

## Update to AWS SDK V3 and URL Format Change

In the recent update of the `@strapi/provider-upload-aws-s3` plugin, we have transitioned from AWS SDK V2 to AWS SDK V3. This significant update brings along a change in the format of the URLs used in Amazon S3 services.

### Understanding the New URL Format

AWS SDK V3 adopts the virtual-hosted–style URI format for S3 URLs. This format is recommended by AWS and is likely to become required in the near future, as the path-style URI is being deprecated. More details on this format can be found in the [AWS User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html#virtual-hosted-style-access).

### Why the Change?

The move to virtual-hosted–style URIs aligns with AWS's recommendation and future-proofing strategies. For an in-depth understanding of AWS's decision behind this transition, you can refer to their detailed post [here](https://aws.amazon.com/es/blogs/aws/amazon-s3-path-deprecation-plan-the-rest-of-the-story/).

### Configuring Your Strapi Application

If you wish to continue using the plugin with Strapi 4.15.x versions or newer without changing your URL format, it's possible to specify your desired URL format directly in the plugin's configuration. Below is an example configuration highlighting the critical `baseUrl` property:

```javascript
upload: {
  config: {
    provider: 'aws-s3',
    providerOptions: {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_ACCESS_SECRET,
      },
      region: process.env.AWS_REGION,
      baseUrl: `https://s3.${region}.amazonaws.com/${bucket}`, // This line sets the custom url format
      params: {
        ACL: process.env.AWS_ACL || 'public-read',
        signedUrlExpires: process.env.AWS_SIGNED_URL_EXPIRES || 15 * 60,
        Bucket: process.env.AWS_BUCKET,
      },
    },
    actionOptions: {
      upload: {},
      uploadStream: {},
      delete: {},
    },
  },
}
```

This configuration ensures compatibility with the updated AWS SDK while providing flexibility in URL format selection, catering to various user needs.

## Security Considerations

This provider includes several security measures to protect against common attack vectors.

### Path Traversal Prevention

File paths, hashes, and extensions are sanitized to prevent directory traversal attacks. Sequences like `../` are removed, and special characters in file extensions are filtered.

### Parameter Injection Protection

The `customParams` option allows passing additional parameters to S3 operations. However, critical security parameters (`Bucket`, `Key`, `Body`) cannot be overridden via `customParams` to prevent unauthorized access to other buckets or objects.

### URL Protocol Validation

Only `http://` and `https://` protocols are accepted for S3 response URLs. This prevents potential injection of dangerous protocols like `file://`, `javascript:`, or `data:`.

### Recommendations

1. **Use Private ACL**: Set `ACL: 'private'` for sensitive content and use signed URLs for access.
2. **Enable Encryption**: Configure server-side encryption for data at rest.
3. **Enable Checksums**: Use `checksumAlgorithm` to ensure data integrity during uploads.
4. **Use Conditional Writes**: Enable `preventOverwrite: true` to prevent accidental overwrites.
5. **Apply Least Privilege**: Use the minimum required IAM permissions listed above.
6. **Enable Bucket Versioning**: Consider enabling S3 versioning for recovery from accidental deletions.
