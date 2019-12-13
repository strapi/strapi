# Hooks

The hooks are modules that add functionality to the core. They are loaded during the server boot.

**File structure**

```js
const fs = require('fs');
const path = require('path');

module.exports = strapi => {
  const hook = {
    /**
     * Default options
     */

    defaults: {
      // config object
    },

    /**
     * Initialize the hook
     */

    async initialize() {
      // await someAsyncCode()
      // this().defaults['your_config'] to access to your configs.
    },
  };

  return hook;
};
```

- `defaults` (object): Contains the defaults configurations. This object is merged to `strapi.config.hook.settings.**`.
- `initialize` (function): Called during the server boot. The callback `cb` needs to be called. Otherwise, the hook won't be loaded.

The hooks are accessible through the `strapi.hook` variable.

## Structure

### Node modules

Every folder that follows this name pattern `strapi-hook-*` in your `./node_modules` folder will be loaded as a hook.

A hook needs to follow the structure below:

```
/strapi-hook-[...]
└─── lib
     - index.js
- LICENSE.md
- package.json
- README.md
```

The `index.js` is the entry point to your hook. It should look like the example above.

## Custom hooks

The framework allows to load hooks from the project directly without having to install them from npm. It's a great way to take advantage of the features of the hooks system for code that doesn't need to be shared between apps. To achieve this, you have to create a `./hooks` folder at the root of your project and put the hooks into it.

```
/project
└─── admin
└─── api
└─── config
└─── hooks
│   └─── strapi-documentation
│        - index.js
│   └─── strapi-server-side-rendering
│        - index.js
└─── public
- favicon.ico
- package.json
- server.js
```

## Configuration and activation

To activate and configure your hook with custom options, you need to edit your `./config/hook.json` file in your Strapi app.

```javascript
{
  ...
  "hook-name": {
    "enabled": true,
    ...
  }
}
```
