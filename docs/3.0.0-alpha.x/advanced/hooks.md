# Hooks

The hooks are modules that add functionality to the core. They are loaded during the server boot. For example, if your project needs to work with a SQL database, your will have to add the hook `strapi-hook-bookshelf` to be able to connect your app with your database.

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

    initialize: cb => {
      // Write your code here.

      // this.defaults['your_config'] to access to your configs.

      cb();
    }
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

### Custom hooks

The framework allows to load hooks from the project directly without having to install them from npm. It's great way to take advantage of the features of the hooks system for code that doesn't need to be shared between apps. To achieve this, you have to create a `./hooks` folder at the root of your project and put the hooks into it.

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
└─── plugins
└─── public
- favicon.ico
- package.json
- server.js
```

## Configuration and activation

To activate and configure your hook with custom options, you need to edit your `./config/hooks.json` file in your Strapi app.
```javascript
{
  ...
  "hook-name": {
    "enabled": true,
    ...
  }
}
```

## Dependencies

It happens that a hook has a dependency to another one. For example, the `strapi-hook-bookshelf` has a dependency to `strapi-hook-knex`. Without it, the `strapi-hook-bookshelf` can't work correctly. It also means that the `strapi-hook-knex` hook has to be loaded before.

To handle this case, you need to update the `package.json` at the root of your hook.

```json
{
  "name": "strapi-hook-bookshelf",
  "version": "x.x.x",
  "description": "Bookshelf hook for the Strapi framework",
  "dependencies": {
    ...
  },
  "strapi": {
    "dependencies": [
      "strapi-hook-knex"
    ]
  }
}
```
