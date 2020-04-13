# Migration guide from beta.19.x to beta.20

Upgrading your Strapi application to `v3.0.0-beta.20`.

**Make sure your server is not running until then end of the migration**

## Upgrading your dependencies

Start by upgrading your dependencies. Make sure to use exact versions.

Update your package.json accordingly:

```json
{
  //...
  "dependencies": {
    "strapi": "3.0.0-beta.20",
    "strapi-admin": "3.0.0-beta.20",
    "strapi-connector-bookshelf": "3.0.0-beta.20",
    "strapi-plugin-content-manager": "3.0.0-beta.20",
    "strapi-plugin-content-type-builder": "3.0.0-beta.20",
    "strapi-plugin-email": "3.0.0-beta.20",
    "strapi-plugin-graphql": "3.0.0-beta.20",
    "strapi-plugin-upload": "3.0.0-beta.20",
    "strapi-plugin-users-permissions": "3.0.0-beta.20",
    "strapi-utils": "3.0.0-beta.20"
  }
}
```

Then run either `yarn install` or `npm install`.

## Index page

Some users have been asking to make the `/` route customizable and to be able to disable it.

To allow customizations, the server will now serve the files in your `./public` folder as is. To migrate, you must delete the `index.html` and `production.html` files in the `./public` directory.

From now on, if you don't have any `index.html` file in your `./public` folder, the server will render the default Strapi homepage.

You can now also disable this behavior this the `public.defaultIndex` option. Read the documentation [here](../concepts/configurations.md#application).

## Upload plugin settings

A lot of our users have been requesting that we move some back-end specific configurations to files. While implementing the media library feature, we decided to move the upload plugin settings to files.

This means that you now have to configure your provider directly in the files. You can read the documentation [here](../plugins/upload.md#using-a-provider) to update.

## MongoDB Media relation changes

In the media library features, We wanted to make sure media would keep their ordering. To implement this in mongo we had to change the way the media relation was built.

Previously, the `upload_file` collection was the one keeping track of the relations and the entity related to the file had not reference to it.
Implementing ordering without cahnges the relations proved unfeasible. FInally we decided to add the reverse reference in the entities so it would make accessing the files really easy.

You will hence need to migrate your `mongo` database to avoid loosing references to your files.

### Backup your database

WHen running in production, you should always backup your database before running migrations. To backup a `mongo` database, look at the documentation [here](https://docs.mongodb.com/manual/core/backups/)

### Export model metadatas

First of create a export.js file at the root of your project with the following content:

```js
const fs = require('fs');

require('strapi')()
  .load()
  .then(() => {
    const models = {};

    Object.keys(strapi.api).forEach(apiName => {
      Object.values(strapi.api[apiName].models || {}).forEach(model => {
        models[model.globalId] = formatModel(model);
      });
    });

    Object.keys(strapi.plugins).forEach(pluginName => {
      Object.values(strapi.plugins[pluginName].models || {}).forEach(model => {
        models[model.globalId] = formatModel(model);
      });
    });

    Object.values(strapi.components).forEach(model => {
      models[model.globalId] = formatModel(model);
    });

    fs.writeFileSync('models.json', JSON.stringify(models, null, 2));
    process.exit(0);
  });

function formatModel(model) {
  return {
    collection: model.collectionName,
    files: Object.keys(model.attributes).reduce((acc, key) => {
      const attr = model.attributes[key];
      if (attr.model === 'file' && attr.plugin === 'upload') {
        acc[key] = 'single';
      }

      if (attr.collection === 'file' && attr.plugin === 'upload') {
        acc[key] = 'multiple';
      }
      return acc;
    }, {}),
  };
}
```

then run the script from the root of your project

```sh
node export.js
```

This script will create a models.json file at the root of your project that looks like:

```json
{
  "ModelName": {
    "collection": "collectionName",
    "files": {
      "image": "single",
      "images": "multiple"
    }
  }
}
```

### Create migration script

You then need to create the mongo shell script to run to migrate your data strucutre. First create a `migration.js` file with the following code:

```js
var models = {
  /* paste the object model.json  here */
};

for (var i in models) {
  var model = models[i];
  var update = {};
  var keyCount = 0;

  for (var key in model.files) {
    keyCount += 1;
    update[key] = '';
  }

  if (keyCount > 0) {
    db.getCollection(model.collection).update({}, { $unset: update }, { multi: true });
  }
}

var fileCursor = db.getCollection('upload_file').find({});

while (fileCursor.hasNext()) {
  var el = fileCursor.next();
  el.related.forEach(function(fileRef) {
    var model = models[fileRef.kind];

    if (!model) {
      return;
    }

    var fieldType = model.files && model.files[fileRef.field];

    // stop if the file points to a field the user didn't specify
    if (!fieldType) {
      return;
    }

    if (fieldType === 'single') {
      db.getCollection(model.collection).updateOne(
        { _id: fileRef.ref },
        { $set: { [fileRef.field]: el._id } }
      );
    } else if (fieldType === 'multiple') {
      db.getCollection(model.collection).updateOne(
        { _id: fileRef.ref },
        { $push: { [fileRef.field]: el._id } }
      );
    }
  });
}
```

Then you will need to copy the content of `models.json` to the `models` variable at the top of this script:

```js
var models = {
  ModelName: {
    collection: 'collectionName',
    files: {
      image: 'single',
      images: 'multiple',
    },
  },
};

// rest of the script
```

Finally you can load this script in your mongo shell and run it.

## Rebuilding your administration panel

Now delete the `.cache` and `build` folders. Then run `yarn develop`.
