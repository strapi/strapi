# strapi-provider-upload-cloudinary

## Configurations

Your configuration is passed down to the cloudinary configuration. (e.g: `cloudinary.config(config)`). You can see the complete list of options [here](https://cloudinary.com/documentation/cloudinary_sdks#configuration_parameters)

**Example**

`./extensions/upload/config/settings.json`

```json
{
  "provider": "cloudinary",
  "providerOptions": {
    "cloud_name": "cloud-name",
    "api_key": "api-key",
    "api_secret": "api-secret"
  }
}
```

## Resources

- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
