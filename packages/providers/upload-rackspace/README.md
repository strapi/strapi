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

## Configurations

Your configuration is passed down to the client initialization. (e.g: `createClient(config)`). The implementation is based on the package `pkgcloud`. You can read the docs [here](https://github.com/pkgcloud/pkgcloud#storage).

See the [using a provider](https://docs.strapi.io/developer-docs/latest/plugins/upload.html#using-a-provider) documentation for information on installing and using a provider. And see the [environment variables](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/environment.html#environment-variables) for setting and using environment variables in your configs.

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
