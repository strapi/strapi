# Hooks

The hooks are modules that add functionality to the core. They are loaded during the server boot. For example, if your project needs to work with a SQL database, your will have to add the hook `strapi-bookshelf` to be able to connect your app with your database.


```js

const fs = require('fs');
const path = require('path');

module.exports = strapi => {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      documentation: {
        path: '/public/documentation'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      try {
        // Check if documentation folder exist.
        fs.accessSync(path.resolve(process.cwd(), this.defaults.documentation.path));
      } catch (e) {
        // Otherwise, create the folder.
        fs.mkdirSync(path.resolve(process.cwd(), this.defaults.documentation.path));
      }

      // This function doesn't really exist,
      // it's just an example to tell you that you
      // run your business logic and when it's done
      // you just need to call the callback `cb`
      generateDocumentation(path.resolve(process.cwd(), this.defaults.documentation.path), cb);
    }
  };

  return hook;
};
```

Every folder that follows this name pattern `strapi-*` in your `./node_modules` folder will be loaded as a hook. The hooks are accessible through the `strapi.hook` variable.

## Dependencies

It happens that a hook has a dependency to another one. For example, the `strapi-bookshelf` has a dependency to `strapi-knex`. Without it, the `strapi-bookshelf` can't work correctly. It also means that the `strapi-knex` hook has to be loaded before.

To handle this case, you need to update the `package.json` at the root of your hook.

```json
{
  "name": "strapi-bookshelf",
  "version": "x.x.x",
  "description": "Bookshelf hook for the Strapi framework",
  "dependencies": {
    ...
  },
  "strapi": {
    "dependencies": [
      "strapi-knex"
    ]
  }
}  
```

## Custom hooks

The framework allows to load hooks from the project directly without having to install them from npm. It's great way to take advantage of the features of the hooks system for code that doesn't need to be shared between apps. To achieve this, you have to create a `./hooks` folder at the root of your project and put the hooks into it.

```
/project
└─── admin
└─── api
└─── config
└─── hooks
│   └─── strapi-documentation
│   └─── strapi-server-side-rendering
└─── plugins
└─── public
- favicon.ico
- package.json
- server.js
```
