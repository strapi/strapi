# Models

See the [models' concepts](../concepts/concepts.md#models) for details.

## How to create a model?

Use the CLI, and run the following command `strapi generate:model user firstname:string lastname:string`. Read the [CLI documentation](../cli/CLI.md) for more informations.

This will create two files located at `./api/user/models`:
 - `User.settings.json`: contains the list of attributes and settings. The JSON format makes the file easily editable.
 - `User.js`: imports `User.settings.json` and extends it with additional settings and lifecycle callbacks.

> Note: when you create a new API using the CLI (`strapi generate:api <name>`), a model is automatically created.

## Define the attributes

The following types are currently available:
  - `string`
  - `text`
  - `integer`
  - `biginteger`
  - `float`
  - `decimal`
  - `password`
  - `date`
  - `time`
  - `datetime`
  - `timestamp`
  - `boolean`
  - `binary`
  - `uuid`
  - `enumeration`
  - `json`
  - `email`

#### Validations

You can apply basic validations to the attributes. The following supported validations are *only supported by MongoDB* connection.
If you're using SQL databases, you should use the native SQL constraints to apply them.

  - `required` (boolean) — if true adds a required validator for this property.
  - `unique` (boolean) — whether to define a unique index on this property.
  - `max` (integer) — checks if the value is greater than or equal to the given minimum.
  - `min` (integer) — checks if the value is less than or equal to the given maximum.


**Security validations**
To improve the Developer eXperience when developing or using the administration panel, the framework enhances the attributes with these "security validations":

  - `private` (boolean) — if true, the attribute will be removed from the server response (it's useful to hide sensitive data).
  - `configurable` (boolean) - if false, the attribute isn't configurable from the Content Type Builder plugin.

#### Example

**Path —** `User.settings.json`.
```json
{
  "connection": "default",
  "info": {
    "name": "user",
    "description": "This represents the User Model"
  },
  "attributes": {
    "firstname": {
      "type": "string"
    },
    "lastname": {
      "type": "string"
    },
    "password": {
      "type": "password"
    },
    "about": {
      "type": "description"
    },
    "age": {
      "type": "integer"
    },
    "birthday": {
      "type": "date"
    }
  }
}
```

## Relations

Refer to the [relations concept](../concepts/concepts.md#relations) for more informations about relations type.

### Many-to-many

Refer to the [many-to-many concept](../concepts/concepts.md#many-to-many).

#### Example

A `product` can be related to many `categories`, so a `category` can have many `products`.

**Path —** `./api/product/models/Product.settings.json`.
```json
{
  "attributes": {
    "categories": {
      "collection": "product",
      "via": "products",
      "dominant": true
    }
  }
}
```

> Note: The `dominant` key allows you to define in which table/collection (only for NoSQL databases) should be stored the array that defines the relationship. Because there is no join table in NoSQL, this key is required for NoSQL databases (ex: MongoDB).

**Path —** `./api/category/models/Category.settings.json`.
```json
{
  "attributes": {
    "products": {
      "collection": "category",
      "via": "categories"
    }
  }
}
```

**Path —** `./api/product/controllers/Product.js`.
```js
// Mongoose example
module.exports = {
  findProductsWithCategories: async (ctx) => {
    // Retrieve the list of products.
    const products = Product
      .find()
      .populate('categories');

    // Send the list of products.
    ctx.body = products;
  }
}
```

**Path —** `./api/category/controllers/Category.js`.
```js
// Mongoose example
module.exports = {
  findCategoriesWithProducts: async (ctx) => {
    // Retrieve the list of categories.
    const categories = Category
      .find()
      .populate('products');

    // Send the list of categories.
    ctx.body = categories;
  }
}
```

### One-to-many

Refer to the [one-to-many concept](../concepts/concepts.md#one-to-many) for more informations.

#### Example

A `user` can have many `articles`, and an `article` can be related to one `user` (author).

**Path —** `./api/user/models/User.settings.json`.
```json
{
  "attributes": {
    "articles": {
      "collection": "article",
      "via": "author"
    }
  }
}
```

**Path —** `./api/article/models/Article.settings.json`.
```json
{
  "attributes": {
    "author": {
      "model": "user"
    }
  }
}
```

**Path —** `./api/user/controllers/User.js`.
```js
// Mongoose example
module.exports = {
  findUsersWithArticles: async (ctx) => {
    // Retrieve the list of users with their articles.
    const users = User
      .find()
      .populate('articles');

    // Send the list of users.
    ctx.body = users;
  }
}
```

**Path —** `./api/article/controllers/Article.js`.
```js
// Mongoose example
module.exports = {
  findArticlesWithAuthors: async (ctx) => {
    // Retrieve the list of articles with their authors.
    const articles = Article
      .find()
      .populate('author');

    // Send the list of users.
    ctx.body = users;
  }
}
```

### One-to-one

Refer to the [one-to-one concept](../concepts/concepts.md#one-to-one) for informations.

#### Example

A `user` can have one `address`. And this address is only related to this `user`.

**Path —** `./api/user/models/User.settings.json`.
```json
{
  "attributes": {
    "address": {
      "model": "address",
      "via": "user"
    }
  }
}
```

**Path —** `./api/address/models/Address.settings.json`.
```json
{
  "attributes": {
    "user": {
      "model": "user"
    }
  }
}
```

**Path —** `./api/user/controllers/User.js`.
```js
// Mongoose example
module.exports = {
  findUsersWithAddresses: async (ctx) => {
    // Retrieve the list of users with their addresses.
    const users = User
      .find()
      .populate('address');

    // Send the list of users.
    ctx.body = users;
  }
}
```

**Path —** `./api/adress/controllers/Address.js`.
```js
// Mongoose example
module.exports = {
  findArticlesWithUsers: async (ctx) => {
    // Retrieve the list of addresses with their users.
    const articles = Address
      .find()
      .populate('user');

    // Send the list of addresses.
    ctx.body = addresses;
  }
}
```
### One-way

Refer to the [one-way concept](../concepts/concepts.md#one-way) for informations.

#### Example

A `pet` can be owned by someone (a `user`).

**Path —** `./api/pet/models/Pet.settings.json`.
```json
{
  "attributes": {
    "owner": {
      "model": "user"
    }
  }
}
```

**Path —** `./api/pet/controllers/Pet.js`.
```js
// Mongoose example
module.exports = {
  findPetsWithOwners: async (ctx) => {
    // Retrieve the list of pets with their owners.
    const pets = Pet
      .find()
      .populate('owner');

    // Send the list of pets.
    ctx.body = pets;
  }
}
```

## Lifecycle callbacks

Refer to the [lifecycle callbacks concepts](../concepts/concepts.md#lifecycle-callbacks) for informations.

The following events are available by default:

Callbacks on `save`:
 - beforeSave
 - afterSave

Callbacks on `fetch`:
 - beforeFetch
 - afterFetch

Callbacks on `fetchAll`:
 - beforeFetchAll
 - afterFetchAll

Callbacks on `create`:
 - beforeCreate
 - afterCreate

Callbacks on `update`:
 - beforeUpdate
 - afterUpdate

Callbacks on `destroy`:
 - beforeDestroy
 - afterDestroy


#### Mongoose

Each of these functions receives a parameter called `next`, which is the callback you should call after your logic is executed. The entry is accessible through `this`.

**Path —** `./api/user/models/User.js`.
```js
module.exports = {
 /**
  * Triggered before user creation.
  */
 beforeCreate: async (model) => {
   // Hash password.
   const passwordHashed = await strapi.api.user.services.user.hashPassword(this.password);

   // Set the password.
   model.password = passwordHashed;
 }
}
```

#### Bookshelf

Each of these functions receives a three parameters `model`, `attrs` and `options`. You have to return a Promise.

**Path —** `./api/user/models/User.js`.
```js
module.exports = {

  /**
   * Triggered before user creation.
   */
  beforeCreate: async (model, attrs, options) => {
      // Hash password.
      const passwordHashed = await strapi.api.user.services.user.hashPassword(model.attributes.password);

      // Set the password.
      model.set('password', passwordHashed);
    });
  }
}
```

## Settings

Additional settings can be set on models:
 - `connection` (string) - Connection's name which must be used. Default value: `default`.
 - `collectionName` (string) - Collection's name (or table's name) in which the data should be stored.
 - `globalId` (string) -Global variable name for this model (case-sensitive).

**Path —** `User.settings.json`.
```json
{
  "connection": "mongo",
  "collectionName": "Users_v1",
  "globalId": "Users",
  "attributes": {

  }
}
```

In this example, the model `User` will be accessible through the `Users` global variable. The data will be stored in the `Users_v1` collection or table and the model will use the `mongo` connection defined in `./config/environments/**/database.json`

> Note: The `connection` value can be changed whenever you want, but you should be aware that there is no automatic data migration process. Also if the new connection doesn't use the same ORM you will have to rewrite your queries.
