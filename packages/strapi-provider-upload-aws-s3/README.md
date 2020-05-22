# strapi-provider-upload-aws-s3

## Configurations

Your configuration is passed down to the provider. (e.g: `new AWS.S3(config)`). You can see the complete list of options [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property)

**Example**

`./extensions/upload/config/settings.json`

```json
{
  "provider": "aws-s3",
  "providerOptions": {
    "accessKeyId": "dev-key",
    "secretAccessKey": "dev-secret",
    "region": "aws-region",
    "params": {
      "Bucket": "my-bucket"
    }
  }
}
```

## Resources

- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
