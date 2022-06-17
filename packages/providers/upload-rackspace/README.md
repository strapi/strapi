# @strapi/provider-upload-rackspace

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
yarn add @strapi/provider-upload-rackspace

# using npm
npm install @strapi/provider-upload-rackspace --save
```

## Configuration

- `provider` defines the name of the provider
- `providerOptions` is passed down during the construction of the provider. (ex: `createClient(config)`). [Complete list of options](https://github.com/pkgcloud/pkgcloud/blob/master/docs/providers/rackspace/README.md). The implementation is based on the package `pkgcloud`. [Documentation](https://github.com/pkgcloud/pkgcloud#storage)
- `actionOptions` is passed directly to each method respectively allowing for custom options. You can find the complete list of [upload/ uploadStream options](https://github.com/pkgcloud/pkgcloud#upload-a-file) and [delete options](https://github.com/pkgcloud/pkgcloud/blob/master/docs/providers/rackspace/storage.md#clientremovefilecontainer-file-functionerr-result--)

See the [documentation about using a provider](https://docs.strapi.io/developer-docs/latest/plugins/upload.html#using-a-provider) for information on installing and using a provider. To understand how environment variables are used in Strapi, please refer to the [documentation about environment variables](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#environment-variables).

### Provider Configuration

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: 'rackspace',
      providerOptions: {
        username: env('RACKSPACE_USERNAME'),
        apiKey: env('RACKSPACE_KEY'),
        region: env('RACKSPACE_REGION'),
        container: env('RACKSPACE_CONTAINER'),
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
          'img-src': ["'self'", 'data:', 'blob:', 'storage.clouddrive.com'],
          'media-src': ["'self'", 'data:', 'blob:', 'storage.clouddrive.com'],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  // ...
];
```
