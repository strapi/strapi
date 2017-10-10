# Prevent a plugin from being rendered

You can prevent your plugin from being rendered if some conditions aren't met.

## Usage

To disable your plugin's rendering, you can simply create `requirements.js` file at the root of your `src` plugin's folder.
This file must contain a default function that returns a `Promise`;

Example:

Let's say that you want to disable your plugin if the server autoReload config is disabled in development mode.

**Path —** `./app/config/environments/development/server.json`.
```
{
  "host": "localhost",
  "port": 1337,
  "autoReload": {
    "enabled": true
  },
  "cron": {
    "enabled": false
  }
}
```

You'll first create a request to check if the `autoReload` config is enabled.

**Path —** `./app/plugins/my-plugin/config/routes.json`.
```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/autoReload",
      "handler": "MyPlugin.autoReload",
      "config": {
        "policies": []
      }
    }
  ]
}
```
Then the associated handler:

**Path —** `./app/plugins/my-plugin/controllers/MyPlugin.js`.
```js
const _ = require('lodash');
const send = require('koa-send');

module.exports = {
  autoReload: async ctx => {
    ctx.send({ autoReload: _.get(strapi.config.environments, 'development.server.autoReload', false) });
  }
}
```

Finally, you'll create a file called `requirements.js`at the root of your plugin's src folder.

The default function exported must return a `Promise`.
If you wan't to prevent the plugin from being rendered you'll have to set `plugin.preventComponentRendering = true;`.
In this case, you'll have to set:
```js
plugin.blockerComponentProps = {
  blockerComponentTitle: 'my-plugin.blocker.title',
  blockerComponentDescription: 'my-plugin.blocker.description',
  blockerComponentIcon: 'fa-refresh',
};
```

To follow the example above:

**Path —** `./app/plugins/my-plugin/admin/src/requirements.js`.
```js
// Use our request helper
import request from 'utils/request';

const shouldRenderCompo = (plugin) => new Promise((resolve, request) => {
  request('/my-plugin/autoReload')
    .then(response => {
      // If autoReload is enabled the response is `{ autoReload: true }`
      plugin.preventComponentRendering = !response.autoReload;
      // Set the BlockerComponent props
      plugin.blockerComponentProps = {
        blockerComponentTitle: 'my-plugin.blocker.title',
        blockerComponentDescription: 'my-plugin.blocker.description',
        blockerComponentIcon: 'fa-refresh',
        blockerComponentContent: 'renderIde', // renderIde will add an ide section that shows the development environment server.json config
      };

      return resolve(plugin);
    })
    .catch(err => reject(err));
});

export default shouldRenderCompo;
```
## Customization

You can render your own custom blocker by doing as follows:

**Path —** `./app/plugins/my-plugin/admin/src/requirements.js`.
```js
// Use our request helper
import request from 'utils/request';

// Your custom blockerComponentProps
import MyCustomBlockerComponent from 'components/MyCustomBlockerComponent';

const shouldRenderCompo = (plugin) => new Promise((resolve, request) => {
  request('/my-plugin/autoReload')
    .then(response => {
      // If autoReload is enabled the response is `{ autoReload: true }`
      plugin.preventComponentRendering = !response.autoReload;

      // Tell which component to be rendered instead
      plugin.blockerComponent = MyCustomBlockerComponent;

      return resolve(plugin);
    })
    .catch(err => reject(err));
});

export default shouldRenderCompo;
```
