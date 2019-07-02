# Models

See the [models' concepts](../concepts/concepts.md#models) for details.

## How to create a model?
::: note
If you are just starting out it is very convenient to generate some models with the Content Type Builder, directly in the admin interface. You can then review the generated model mappings on the code level. The UI takes over a lot of validation tasks and gives you a fast feeling for available features.
:::

Use the CLI, and run the following command `strapi generate:model user firstname:string lastname:string`. Read the [CLI documentation](../cli/CLI.md) for more informations.

This will create two files located at `./api/user/models`:
 - `User.settings.json`: contains the list of attributes and settings. The JSON format makes the file easily editable.
 - `User.js`: imports `User.settings.json` and extends it with additional settings and lifecycle callbacks.

::: note
when you create a new API using the CLI (`strapi generate:api <name>`), a model is automatically created.
:::

## Model Information
The info key on the model-json states information about the model. This information is used in the admin interface, when showing the model.
   - `name`: The name of the model, as shown in admin interface.
   - `description`: The description of the model.
   - `mainField`: Determines which model-attribute is shown when displaying the model.

## Model options
The options key on the model-json states.
   - `idAttribute`: This tells the model which attribute to expect as the unique identifier for each database row (typically an auto-incrementing primary key named 'id'). _Only valid for strapi-hook-bookshelf_
   - `idAttributeType`: Data type of `idAttribute`, accepted list of value bellow. _Only valid for strapi-hook-bookshelf_
   - `timestamps`: This tells the model which attributes to use for timestamps. Accepts either `boolean` or `Array` of strings where frist element is create data and second elemtent is update date. Default value when set to `true` for Bookshelf is `["created_at", "updated_at"]` and for MongoDB is `["createdAt", "updatedAt"]`.

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
  - `index` (boolean) — adds an index on this property, this will create a [single field index](https://docs.mongodb.com/manual/indexes/#single-field) that will run in the background (*only supported by MongoDB*).
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
    "description": "This represents the User Model",
    "mainField": "email"
  },
  "attributes": {
    "firstname": {
      "type": "string"
    },
    "lastname": {
      "type": "string"
    },
    "email": {
      "type": "email",
      "required": true,
      "unique": true
    },
    "password": {
      "type": "password",
      "required": true,
      "private": true
    },
    "about": {
      "type": "description"
    },
    "age": {
      "type": "integer",
      "min": 18,
      "max": 99,
      "index": true
    },
    "birthday": {
      "type": "date"
    }
  }
}
```

## Relations

Refer to the [relations concept](../concepts/concepts.md#relations) for more informations about relations type.

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

**Example**
```js
// Create a pet
const xhr = new XMLHttpRequest();
xhr.open('POST', '/pets', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify({
  owner: '5c151d9d5b1d55194d3209be' // The id of the user you want to link
}));
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

**Example**
```js
// Create an address
const xhr = new XMLHttpRequest();
xhr.open('POST', '/addresses', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify({
  user: '5c151d9d5b1d55194d3209be' // The id of the user you want to link
}));
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
    ctx.body = articles;
  }
}
```

**Examples**
```js
// Create an article
const xhr = new XMLHttpRequest();
xhr.open('POST', '/articles', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify({
  author: '5c151d9d5b1d55194d3209be' // The id of the user you want to link
}));

// Update an article
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/users/5c151d9d5b1d55194d3209be', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify({
  articles: ['5c151d51eb28fd19457189f6', '5c151d51eb28fd19457189f8'] // Set of ALL articles linked to the user (existing articles + new article or - removed article)
}));
```

### Many-to-many

Refer to the [many-to-many concept](../concepts/concepts.md#many-to-many).

#### Example

A `product` can be related to many `categories`, so a `category` can have many `products`.

**Path —** `./api/product/models/Product.settings.json`.
```json
{
  "attributes": {
    "categories": {
      "collection": "category",
      "via": "products",
      "dominant": true
    }
  }
}
```

::: note
(NoSQL databases only) The `dominant` key defines which table/collection should store the array that defines the relationship. Because there are no join tables in NoSQL, this key is required for NoSQL databases (ex: MongoDB).
:::

**Path —** `./api/category/models/Category.settings.json`.
```json
{
  "attributes": {
    "products": {
      "collection": "product",
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

**Example**
```js
// Update a product
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/products/5c151d9d5b1d55194d3209be', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify({
  categories: ['5c151d51eb28fd19457189f6', '5c151d51eb28fd19457189f8'] // Set of ALL categories linked to the product (existing categories + new category or - removed category)
}));
```

### Polymorphic

The polymorphic relationships are the solution when you don't know which kind of model will be associated to your entry. A common use case is an `Image` model that can be associated to many others kind of models (Article, Product, User, etc).

Refer to the [upload plugin](./upload.md) polymorphic implementation for more informations.

#### Single vs Many

Let's stay with our `Image` model which might belongs to **a single `Article` or `Product` entry**.

::: note
In other words, it means that a `Image` entry can be associated to one entry. This entry can be a `Article` or `Product` entry.
:::

**Path —** `./api/image/models/Image.settings.json`.
```json
{
  "attributes": {
    "related": {
      "model": "*",
      "filter": "field"
    }
  }
}
```

Also, our `Image` model which might belongs to **many `Article` or `Product` entries**.

::: note
In other words, it means that a `Article` entry can relate to the same image than a `Product` entry.
:::

**Path —** `./api/image/models/Image.settings.json`.
```json
{
  "attributes": {
    "related": {
      "collection": "*",
      "filter": "field"
    }
  }
}
```

#### Filter

The `filter` attribute is optional (but we highly recommend to use every time). If it's provided it adds a new match level to retrieve the related data.

For example, the `Product` model might have two attributes which are associated to the `Image` model. To distinguish which image is attached to the `cover` field and which images are attached to the `pictures` field, we need to save and provide this to the database.

**Path —** `./api/article/models/Product.settings.json`.
```json
{
  "attributes": {
    "cover": {
      "model": "image",
      "via": "related",
    },
    "pictures": {
      "collection": "image",
      "via": "related"
    }
  }
}
```

The value is the `filter` attribute is the name of the column where the information is stored.

#### Example

A `Image` model might belongs to many either `Article` models or a `Product` models.

**Path —** `./api/image/models/Image.settings.json`.
```json
{
  "attributes": {
    "related": {
      "collection": "*",
      "filter": "field"
    }
  }
}
```

**Path —** `./api/article/models/Article.settings.json`.
```json
{
  "attributes": {
    "avatar": {
      "model": "image",
      "via": "related"
    }
  }
}
```

**Path —** `./api/article/models/Product.settings.json`.
```json
{
  "attributes": {
    "pictures": {
      "collection": "image",
      "via": "related"
    }
  }
}
```

**Path —** `./api/image/controllers/Image.js`.
```js
// Mongoose example
module.exports = {
  findFiles: async (ctx) => {
    // Retrieve the list of images with the Article or Product entries related to them.
    const images = Images
      .find()
      .populate('related');

    /*
    [{
      "_id": "5a81b0fa8c063a53298a934a",
      "url": "http://....",
      "name": "john_doe_avatar.png",
      "related": [{
        "_id": "5a81b0fa8c063a5393qj934a",
        "title": "John Doe is awesome",
        "description": "..."
      }, {
        "_id": "5a81jei389ns5abd75f79c",
        "name": "A simple chair",
        "description": "..."
      }]
    }]
    */

    // Send the list of files.
    ctx.body = images;
  }
}
```

**Path —** `./api/article/controllers/Article.js`.
```js
// Mongoose example
module.exports = {
  findArticlesWithAvatar: async (ctx) => {
    // Retrieve the list of articles with the avatar (image).
    const articles = Article
      .find()
      .populate('avatar');

    /*
    [{
      "_id": "5a81b0fa8c063a5393qj934a",
      "title": "John Doe is awesome",
      "description": "...",
      "avatar": {
        "_id": "5a81b0fa8c063a53298a934a",
        "url": "http://....",
        "name": "john_doe_avatar.png"
      }
    }]
    */

    // Send the list of users.
    ctx.body = articles;
  }
}
```

**Path —** `./api/product/controllers/Product.js`.
```js
// Mongoose example
module.exports = {
  findProductWithPictures: async (ctx) => {
    // Retrieve the list of products with the pictures (images).
    const products = Product
      .find()
      .populate('pictures');

    /*
    [{
      "_id": "5a81jei389ns5abd75f79c",
      "name": "A simple chair",
      "description": "...",
      "pictures": [{
        "_id": "5a81b0fa8c063a53298a934a",
        "url": "http://....",
        "name": "chair_position_1.png"
      }, {
        "_id": "5a81d22bee1ad45abd75f79c",
        "url": "http://....",
        "name": "chair_position_2.png"
      }, {
        "_id": "5a81d232ee1ad45abd75f79e",
        "url": "http://....",
        "name": "chair_position_3.png"
      }]
    }]
    */

    // Send the list of users.
    ctx.body = products;
  }
}
```

#### Database implementation

If you're using MongoDB as a database, you don't need to do anything. Everything is natively handled by Strapi. However, to implement a polymorphic relationship with SQL databases, you need to create two tables.

**Path —** `./api/image/models/Image.settings.json`.
```json
{
  "attributes": {
    "name": {
      "type": "string"
    },
    "url": {
      "type": "string"
    },
    "related": {
      "collection": "*",
      "filter": "field"
    }
  }
}
```

The first table to create is the table which has the same name as your model.
```
CREATE TABLE `image` (
  `id` int(11) NOT NULL,
  `name` text NOT NULL,
  `text` text NOT NULL
)
```

::: note
If you've overrided the default table name given by Strapi by using the `collectionName` attribute. Use the value set in the `collectionName` to name the table.
:::

The second table will allow us to associate one or many others entries to the `Image` model. The name of the table is the same as the previous one with the suffix `_morph`.
```
CREATE TABLE `image_morph` (
  `id` int(11) NOT NULL,
  `image_id` int(11) NOT NULL,
  `related_id` int(11) NOT NULL,
  `related_type` text NOT NULL,
  `field` text NOT NULL
)
```

- `image_id` is using the name of the first table with the suffix `_id`.
  - **Attempted value:** It correspond to the id of an `Image` entry.
- `related_id` is using the attribute name where the relation happens with the suffix `_id`.
  - **Attempted value:** It correspond to the id of an `Article` or `Product` entry.
- `related_type` is using the attribute name where the relation happens with the suffix `_type`.
  - **Attempted value:** It correspond to the table name where the `Article` or `Product` entry is stored.
- `field` is using the filter property value defined in the model. If you change the filter value, you have to change the name of this column as well.
  - **Attempted value:** It correspond to the attribute of a `Article`, `Product` with which the `Image` entry is related.


| id | image_id | related_id | related_type | field  |
|----|----------|------------|--------------|--------|
| 1  | 1738     | 39         | product      | cover  |
| 2  | 4738     | 58         | article      | avatar |
| 3  | 1738     | 71         | article      | avatar |

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

The entry is available through the `model` parameter

**Path —** `./api/user/models/User.js`.
```js
module.exports = {
 /**
  * Triggered before user creation.
  */
 beforeCreate: async (model) => {
   // Hash password.
   const passwordHashed = await strapi.api.user.services.user.hashPassword(model.password);

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

::: note
The `connection` value can be changed whenever you want, but you should be aware that there is no automatic data migration process. Also if the new connection doesn't use the same ORM you will have to rewrite your queries.
:::
