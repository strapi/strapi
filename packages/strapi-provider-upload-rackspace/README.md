# strapi-provider-upload-rackspace

## Configurations

Your configuration is passed down to the client initialization. (e.g: `createClient(config)`). The implementation is based on the package `pkgcloud`. You can read the docs [here](https://github.com/pkgcloud/pkgcloud#storage).

See the [using a provider](https://strapi.io/documentation/v3.x/plugins/upload.html#using-a-provider) documentation for information on installing and using a provider. And see the [environment variables](https://strapi.io/documentation/v3.x/concepts/configurations.html#environment-variables) for setting and using environment variables in your configs.

**Example**

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    provider: 'rackspace',
    providerOptions: {
      username: env('RACKSPACE_USERNAME'),
      apiKey: env('RACKSPACE_KEY'),
      region: env('RACKSPACE_REGION'),
    },
  },
  // ...
});
```

## Resources

- [License](LICENSE)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
