# strapi-provider-upload-rackspace

---

## Deprecation Warning :warning:

Hello! We have some news to share,

We’ve decided it’ll soon be time to end the support for `strapi-provider-upload-rackspace`.

After years of iterations, Strapi is going to V4 and we won’t maintain V3 packages when it’ll reach its end-of-support milestone (~end of Q3 2022).

If you’ve been using `strapi-provider-upload-rackspace` and have migrated to V4 (or if you want to), you can find the equivalent and updated version of this package at this [URL](https://github.com/strapi/strapi/tree/master/packages/providers/upload-rackspace) and with the following name on NPM: `@strapi/provider-upload-rackspace`.

If you’ve contributed to the development of this package, thank you again for that! We hope to see you on the V4 soon.

The Strapi team

---

## Configurations

Your configuration is passed down to the client initialization. (e.g: `createClient(config)`). The implementation is based on the package `pkgcloud`. You can read the docs [here](https://github.com/pkgcloud/pkgcloud#storage).

See the [using a provider](https://strapi.io/documentation/developer-docs/latest/development/plugins/upload.html#using-a-provider) documentation for information on installing and using a provider. And see the [environment variables](https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#environment-variables) for setting and using environment variables in your configs.

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
      container: env('RACKSPACE_CONTAINER'),
    },
  },
  // ...
});
```

## Resources

- [License](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi community on Slack](https://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
