# Custom Webpack Config

In order to extend the usage of webpack, you can define a function that extends its config inside `admin/admin.config.js`, like so:

```js
module.exports = {
  webpack: (config, webpack) => {
    // Note: we provide webpack above so you should not `require` it
    // Perform customizations to webpack config
    // Important: return the modified config
    config.plugins.push(new webpack.IgnorePlugin(/\/__tests__\//));

    return config;
  },
};
```
