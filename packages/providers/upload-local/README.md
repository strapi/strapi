# strapi-provider-upload-local

## Configurations

This provider has only one parameter: `sizeLimit`.

**Example**

`./extensions/upload/config/settings.json`

```json
{
  "provider": "local",
  "providerOptions": {
    "sizeLimit": 100000
  }
}
```

The `sizeLimit` parameter must be a number. Be aware that the unit is in bytes, and the default is 1000000. When setting this value high, you should make sure to also configure the body parser middleware `maxFileSize` so the file can be sent and processed. Read more [here](https://strapi.io/documentation/developer-docs/latest/development/plugins/upload.html#configuration)

## Resources

- [License](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi community on Slack](https://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
