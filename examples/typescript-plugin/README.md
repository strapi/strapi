# Typescript Plugin Example

This is an example plugin written in Typescript that serves as a base for more complex projects.

## Requirements

- A Strapi application running in V4 or above
- Node

## Get Started

### Building the Plugin

In order to use the plugin, you'll need to transpile the code to Javascript.

To do so, you can use one of the following commands:

1. `yarn run build`

   Which will transpile the plugin's code once

2. `yarn run build:watch`

   Which will transpile the plugin's code everytime a change is detected

You can configure the build directory from your tsconfig.json file using `compilerOptions.outDir`.

### Linking the Plugin

In order for Strapi to recognize & use the plugin, you'll need to register it.

Head over the `/config/plugin.js` file located in your Strapi app and adds the following configuration (don't forget to replace `resolve`'s path with the one to your transpiled plugin code):

```js
module.exports = () => ({
  // ...
  tsplugin: {
    enabled: true,
    resolve: `<ts_plugin_dir>/<out_dir>`, // From the root of the app
  },
});
```

### Using the Plugin

Once the plugin is registered, you can reference it (and its services, controllers, etc...) by using `strapi.plugin('tsplugin')'`.

If you want to try out the `foo` service provided, you can use the following line:

```js
strapi
  .plugin('tsplugin')
  .service('foo')
  .bar("It's working!");
```

It should log

```
Hello from my Typescript plugin!
It's working
```
