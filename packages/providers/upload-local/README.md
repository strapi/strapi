# @strapi/provider-upload-local

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
yarn add @strapi/provider-upload-local

# using npm
npm install @strapi/provider-upload-local --save
```

## Configurations

This provider has only one parameter: `sizeLimit`.

### Provider Configuration

`./config/plugins.js`

```js
module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: 'local',
      sizeLimit: 100000,
    },
  },
  // ...
});
```

The `sizeLimit` parameter must be a number. Be aware that the unit is in bytes, and the default is 1000000. When setting this value high, you should make sure to also configure the body parser middleware `maxFileSize` so the file can be sent and processed. Read more [here](https://docs.strapi.io/developer-docs/latest/plugins/upload.html#configuration)

### Security Middleware Configuration

Special configuration of the Strapi Security Middleware is not required on this provider since the default configuration allows loading images and media from `"'self'"`.
