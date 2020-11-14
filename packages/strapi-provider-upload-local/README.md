# strapi-provider-upload-local

## Configurations

This provider has four parameters for the `providerOptions`

| Variable     | Type    | Description                                    | Required                                                                         | Default |
| ------------ | ------- | ---------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| sizeLimit    | number  | size limit for uploaded files (in bytes)       | yes                                                                              | 1000000 |
| enableCache  | boolean | enables caching for uploaded files             | no                                                                               | false   |
| cacheOptions | object  | object that holds the config for the cache     | no                                                                               | { }     |
| lruOptions   | object  | object that holds the config for the lru-cache | no, but highly recommended if cache is enabled and `cacheOptions.dynamic = true` | { }     |

**Example**

`./extensions/upload/config/settings.json`

The `sizeLimit` parameter must be a number. Be aware that the unit is in bytes, and the default is 1000000. When setting this value high, you should make sure to also configure the body parser middleware `maxFileSize` so the file can be sent and processed. Read more [here](https://strapi.io/documentation/v3.x/plugins/upload.html#configuration)

```json
{
  "provider": "local",
  "providerOptions": {
    "sizeLimit": 100000
  }
}
```

**Example with caching headers**

`./extensions/upload/config/settings.json`

This provides caching headers for browsers e.g. the [ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag) and a customizable `maxAge` header. Your cache configuration is passed down to the provider. You can see the complete list of options [here](https://github.com/koajs/static-cache). By default the data is streamed instead of cached in the memory.

```json
{
  "provider": "local",
  "providerOptions": {
    "sizeLimit": 100000,
    "enableCache": true,
    "cacheOptions": {
      "maxAge": 86400000
    }
  }
}
```

**Example with caching and dynamic loading**

`./extensions/upload/config/settings.json`

This provides the same settings as in the example above as well as server-side caching with a LRU-cache. Your cache configurations are passed down to the provider. You can see the complete list of options [here](https://github.com/koajs/static-cache) and for the lru-cache [here](https://github.com/isaacs/node-lru-cache).

_Warning:_ it is highly recommended to provide valid settings for the LRU-cache when setting `cacheOptions.dynamic = true` to prevent OOM errors!

```json
{
  "provider": "local",
  "providerOptions": {
    "sizeLimit": 100000,
    "enableCache": true,
    "cacheOptions": {
      "maxAge": 86400000,
      "dynamic": true
    },
    "lruOptions": {
      "max": 1000
    }
  }
}
```

## Resources

- [License](LICENSE)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
