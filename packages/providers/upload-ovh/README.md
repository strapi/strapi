# @strapi/provider-upload-ovh

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
yarn add @strapi/provider-upload-ovh

# using npm
npm install @strapi/provider-upload-ovh --save
```

### Provider Configuration

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: 'ovh',
      providerOptions: {
        keystoneAuthVersion: 'v3',
        provider: 'openstack',
        username: env('STORAGE_USERNAME'),
        password: env('STORAGE_PASSWORD'),
        region: env('STORAGE_REGION', 'GRA'),
        domainId: env('STORAGE_DOMAIN_ID', 'default'),
        domainName: env('STORAGE_TENANT_NAME', 'tenant_name'),
        authUrl: env('STORAGE_AUTH_URL', 'https://auth.cloud.ovh.net/'),
        defaultContainerName: env('STORAGE_CONTAINER_NAME'),
        publicUrlPrefix: env('STORAGE_PUBLIC_URL_PREFIX'),
      },
    },
  },
  // ...
});
```
