# strapi-provider-upload-rackspace

## Configurations

Your configuration is passed down to the client initialization. (e.g: `createClient(config)`). The implementation is based on the package `pkgcloud`. You can read the docs [here](https://github.com/pkgcloud/pkgcloud#storage).

**Example**

`./extensions/upload/config/settings.json`

```json
{
  "provider": "rackspace",
  "providerOptions": {
    "username": "user-name",
    "apiKey": "api-key",
    "region": "IAD"
  }
}
```

## Resources

- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
