# Webhooks

If you are using a static website generator (or framework with build option) with Strapi (Gatsby, Nuxt, Next, etc.) it is necessary to rebuild it when the content is updated in Strapi. In a Headless CMS, this is typically called a [Webhook feature](https://strapi.io/marketplace/webhooks). Unfortunately it is not available yet in Strapi even if [it has been requested](https://portal.productboard.com/strapi/c/27-webhooks).

But what we like at Strapi is to help developers. So even if the feature is not developed yet, here is an easy to implement work around!

### Discovering the lifecycle callbacks 🔍

As you may know, every Content Type (aka models) has lifecycle callbacks: functions which are triggered every time an entry is fetched, inserted, updated or deleted. Here is the list:

 - Callbacks on `save` (both triggered on entry creation and update): `beforeSave`, `afterSave`.
 - Callbacks on `fetch`: `beforeFetch`, `afterFetch`.
 - Callbacks on `fetchAll`: `beforeFetchAll`, `afterFetchAll`.
 - Callbacks on `create`: `beforeCreate`, `afterCreate`.
 - Callbacks on `update`: `beforeUpdate`, `afterUpdate`.
 - Callbacks on `destroy`: `beforeDestroy`, `afterDestroy`.

All of these functions are available in a file located at `api/yourContentType/models/YourContentType.js`.

If your goal is to rebuild a static website, the only useful callbacks are `afterCreate`, `afterUpdate` and `afterDestroy`. So, uncomment them, add logs and try to create, update and delete entries from the admin panel.

**Path —** `api/yourContentType/models/YourContentType.js`.

```js
'use strict';

/**
 * Lifecycle callbacks for the `Post` model.
 */

module.exports = {  
  afterCreate: async (entry) => {
    console.log('afterCreate');
  },

  afterUpdate: async (entry) => {
    console.log('afterUpdate');
  },

  afterDestroy: async (entry) => {
    console.log('afterDestroy');
  }
};
```

### Making the HTTP call 🔊

We are almost there: the only thing we still need to do is to actually make the HTTP call to the URL which will rebuild the static website.

#### URL config

So first of all, let's store this URL in a proper way. To do so, edit `config/environments/development/custom.json`:

**Path —** `config/environments/development/custom.json`.

```json
{
  "staticWebsiteBuildURL": "https://yourservice.com/"
}
```

Do the same thing for other environments.

#### HTTP call

Now it is time to make the HTTP call. In this example we will use `axios`. Let's install it:

```
npm i axios --save
```

Edit `api/yourContentType/models/YourContentType.js`:

**Path —** `api/yourContentType/models/YourContentType.js`.

```js
'use strict';

const axios = require('axios');

/**
 * Lifecycle callbacks for the `Post` model.
 */

module.exports = {  
  afterCreate: async (entry) => {
    axios.post(strapi.config.currentEnvironment.staticWebsiteBuildURL, entry)
      .catch(() => {
          // Ignore
        }
      );
  },

  afterUpdate: async (entry) => {
    axios.post(strapi.config.currentEnvironment.staticWebsiteBuildURL, entry)
      .catch(() => {
          // Ignore
        }
      );
  },

  afterDestroy: async (entry) => {
    axios.post(strapi.config.currentEnvironment.staticWebsiteBuildURL, entry)
      .catch(() => {
          // Ignore
        }
      );
  }
};
```

#### Mongoose limitation

Until September 2018, `remove` lifecycle callback [was not supported by Mongoose](https://github.com/Automattic/mongoose/issues/3054). This has been added but `strapi-hook-mongoose` is not adapted yet to this update.

So, to trigger an url on delete, please add `request.post(strapi.config.currentEnvironment.staticWebsiteBuildURL, entry);` in:

 - `remove` action of `api/yourContentType/services/YourContentType.js` (triggered by your public API).
 - `delete` action of `plugins/content-manager/services/ContentManager.js` (triggered by the Content Manager).

::: note
Do not forget to require `axios` at the top of these files.
:::
