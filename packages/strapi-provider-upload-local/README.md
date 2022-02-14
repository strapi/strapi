# strapi-provider-upload-local

---

## Deprecation Warning :warning:

Hello! We have some news to share,

We’ve decided it’ll soon be time to end the support for `strapi-provider-upload-local`.

After years of iterations, Strapi is going to V4 and we won’t maintain V3 packages when it’ll reach its end-of-support milestone (~end of Q3 2022).

If you’ve been using `strapi-provider-upload-local` and have migrated to V4 (or if you want to), you can find the equivalent and updated version of this package at this [URL](https://github.com/strapi/strapi/tree/master/packages/providers/upload-local) and with the following name on NPM: `@strapi/provider-upload-local`.

If you’ve contributed to the development of this package, thank you again for that! We hope to see you on the V4 soon.

The Strapi team

---

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
