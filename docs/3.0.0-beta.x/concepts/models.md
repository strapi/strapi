# Models

## Concept

### Content Type's models

Models are a representation of the database's structure and life cycle. They are split into two separate files. A JavaScript file that contains the life cycle callbacks, and a JSON one that represents the data stored in the database and their format. The models also allow you to define the relationships between them.

**Path —** `./api/restaurant/models/Restaurant.js`.

```js
module.exports = {
  // Before saving a value.
  // Fired before an `insert` or `update` query.
  beforeSave: (model, attrs, options) => {},

  // After saving a value.
  // Fired after an `insert` or `update` query.
  afterSave: (model, attrs, options) => {},

  // ... and more
};
```

**Path —** `./api/restaurant/models/Restaurant.settings.json`.

```json
{
  "kind": "collectionType",
  "connection": "default",
  "info": {
    "name": "restaurant",
    "description": "This represents the Restaurant Model"
  },
  "attributes": {
    "cover": {
      "collection": "file",
      "via": "related",
      "plugin": "upload"
    },
    "name": {
      "default": "",
      "type": "string"
    },
    "description": {
      "default": "",
      "type": "text"
    }
  }
}
```

In this example, there is a `Restaurant` model which contains the attributes `cover`, `name` and `description`.

### Component's models

It also exist another type of models named `components`. A component is a data structure that can be used in one or many other API's model. There is no lifecycle related, only a JSON file definition

**Path —** `./components/default/simple.json`

```json
{
  "connection": "default",
  "collectionName": "components_default_simples",
  "info": {
    "name": "simple",
    "icon": "arrow-circle-right"
  },
  "options": {},
  "attributes": {
    "name": {
      "type": "string"
    }
  }
}
```

In this example, there is a `Simple` component which contains the attributes `name`. And the component is in the category `default`.

### Where are the models defined?

For **Content Types**, models are defined in each `./api/**/models/` folder. Every JavaScript or JSON file in these folders will be loaded as a model. They are also available through the `strapi.models` and `strapi.api.**.models` global variables. Usable everywhere in the project, they contain the ORM model object that they refer to. By convention, a model's name should be written in lowercase.

For **Components**, models are defined in `./components` folder. Every components has to be under a subfolder (the category name of the component).

## How to create a model?

::: tip
If you are just starting out it is very convenient to generate some models with the Content Type Builder, directly in the admin interface. You can then review the generated model mappings on the code level. The UI takes over a lot of validation tasks and gives you a feeling for available features.
:::

### For Content Types models

Use the CLI, and run the following command `strapi generate:model restaurant name:string description:text`.<br>Read the [CLI documentation](../cli/CLI.md) for more information.

This will create two files located at `./api/restaurant/models`:

- `Restaurant.settings.json`: contains the list of attributes and settings. The JSON format makes the file easily editable.
- `Restaurant.js`: imports `Restaurant.settings.json` and extends it with additional settings and life cycle callbacks.

::: tip
When you create a new API using the CLI (`strapi generate:api <name>`), a model is automatically created.
:::

### For Components models

To create a component you will have to use the Content Type Builder from the Admin panel, there is no generator for components.

Or you can create your component manually by following the file path discribed previously and by following the file structure discribed bellow.

## Model settings

Additional settings can be set on models:

- `kind` (string) - Define if the model is a Collection Type (`collectionType`) of a Single Type (`singleType`) - _only for Content Types_
- `connection` (string) - Connection name which must be used. Default value: `default`.
- `collectionName` (string) - Collection name (or table name) in which the data should be stored.
- `globalId` (string) - Global variable name for this model (case-sensitive) - _only for Content Types_
- `attributes` (object) - Define the data structure of your model. Find available options [bellow](#define-the-attributes).

**Path —** `Restaurant.settings.json`.

```json
{
  "kind": "collectionType",
  "connection": "mongo",
  "collectionName": "Restaurants_v1",
  "globalId": "Restaurants",
  "attributes": {}
}
```

In this example, the model `Restaurant` will be accessible through the `Restaurants` global variable. The data will be stored in the `Restaurants_v1` collection or table and the model will use the `mongo` connection defined in `./config/environments/**/database.json`

::: warning
If not set manually in the JSON file, Strapi will adopt the filename as `globalId`.
The `globalId` serves as a reference to your model within relations and Strapi APIs. If you chose to rename it (either by renaming your file or by changing the value of the `globalId`), you'd have to migrate your tables manually and update the references.
Please note that you should not alter Strapi's models `globalId` (plugins and core ones) since it is used directly within Strapi APIs and other models' relations.
:::

::: tip
The `connection` value can be changed whenever you want, but you should be aware that there is no automatic data migration process. Also if the new connection doesn't use the same ORM you will have to rewrite your queries.
:::

## Model information

The info key on the model-json states information about the model. This information is used in the admin interface, when showing the model.

- `name`: The name of the model, as shown in admin interface.
- `description`: The description of the model.
- `icon`: The fontawesome V5 name - _only for Components_

**Path —** `Restaurant.settings.json`.

```json
{
  "info": {
    "name": "restaurant",
    "description": ""
  }
}
```

## Model options

The options key on the model-json states.

- `timestamps`: This tells the model which attributes to use for timestamps. Accepts either `boolean` or `Array` of strings where first element is create date and second element is update date. Default value when set to `true` for Bookshelf is `["created_at", "updated_at"]` and for MongoDB is `["createdAt", "updatedAt"]`.

**Path —** `User.settings.json`.

```json
{
  "options": {
    "timestamps": true
  }
}
```

## Define the attributes

The following types are currently available:

- `string`
- `text`
- `richtext`
- `email`
- `password`
- `integer`
- `biginteger`
- `float`
- `decimal`
- `date`
- `time`
- `datetime`
- `boolean`
- `enumeration`
- `json`
- `uid`

### Validations

You can apply basic validations to the attributes. The following supported validations are _only supported by MongoDB_ connection.
If you're using SQL databases, you should use the native SQL constraints to apply them.

- `required` (boolean) — If true, adds a required validator for this property.
- `unique` (boolean) — Whether to define a unique index on this property.
- `index` (boolean) — Adds an index on this property, this will create a [single field index](https://docs.mongodb.com/manual/indexes/#single-field) that will run in the background. _Only supported by MongoDB._
- `max` (integer) — Checks if the value is greater than or equal to the given maximum.
- `min` (integer) — Checks if the value is less than or equal to the given minimum.

**Security validations**

To improve the Developer Experience when developing or using the administration panel, the framework enhances the attributes with these "security validations":

- `private` (boolean) — If true, the attribute will be removed from the server response (it's useful to hide sensitive data).
- `configurable` (boolean) - if false, the attribute isn't configurable from the Content Type Builder plugin.

### Exceptions

**`uid`**

- This field type allows a `targetField` key. The value is the name of an attribute thas has `string` of `text` type.
- This field also allows an `options` field. The value is a set of options passed to [the underlying `uid` generator](https://github.com/sindresorhus/slugify). A caveat is that the resulting `uid` must abide to the following RegEx `/^[A-Za-z0-9-_.~]*$`.

### Example

**Path —** `Restaurant.settings.json`.

```json
{
  ...
  "attributes": {
    "title": {
      "type": "string",
      "min": 3,
      "max": 99,
      "unique": true
    },
    "description": {
      "default": "My description",
      "type": "text",
      "required": true
    },
    "slug": {
      "type": "uid",
      "targetField": "title"
    }
    ...
  }
}
```

## Relations

Relations let you create links (relations) between your Content Types.

:::: tabs

::: tab "One-Way" id="one-way"

One-way relationships are useful to link an entry to another. However, only one of the models can be queried with its populated items.

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

**Example**

```js
// Create a pet
const xhr = new XMLHttpRequest();
xhr.open('POST', '/pets', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    owner: '5c151d9d5b1d55194d3209be', // The id of the user you want to link
  })
);
```

:::

::: tab "One-to-One" id="one-to-one"

One-to-One relationships are useful when you have one entity that could be linked to only one other entity. And vice versa.

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

**Example**

```js
// Create an address
const xhr = new XMLHttpRequest();
xhr.open('POST', '/addresses', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    user: '5c151d9d5b1d55194d3209be', // The id of the user you want to link
  })
);
```

:::

::: tab "One-to-Many" id="one-to-many"

One-to-Many relationships are useful when an entry can be liked to multiple entries of another Content Type. And an entry of the other Content Type can be linked to only one entry.

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

**Examples**

```js
// Create an article
const xhr = new XMLHttpRequest();
xhr.open('POST', '/articles', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    author: '5c151d9d5b1d55194d3209be', // The id of the user you want to link
  })
);

// Update an article
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/users/5c151d9d5b1d55194d3209be', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    articles: ['5c151d51eb28fd19457189f6', '5c151d51eb28fd19457189f8'], // Set of ALL articles linked to the user (existing articles + new article or - removed article)
  })
);
```

:::

::: tab "Many-to-Many" id="many-to-many"

Many-to-Many relationships are useful when an entry can be liked to multiple entries of another Content Type. And an entry of the other Content Type can be linked to many entries.

#### Example

A `product` can be related to many `categories`, so a `category` can have many `products`.

**Path —** `./api/product/models/Product.settings.json`.

```json
{
  "attributes": {
    "categories": {
      "collection": "category",
      "via": "products",
      "dominant": true,
      "collectionName": "products_categories__categories_products" // optional
    }
  }
}
```

**NOTE**:
(NoSQL databases only) The `dominant` key defines which table/collection should store the array that defines the relationship. Because there are no join tables in NoSQL, this key is required for NoSQL databases (e.g. MongoDB).

**NOTE**:
(NoSQL databases only) The `collectionName` key defines the name of the join table. It has to be specified once, in the `dominant` attribute of the relation. If it is not specified, Strapi will use a generated default one. It is useful to define the name of the join table when the name generated by Strapi is too long for the database you use.

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

**Example**

```js
// Update a product
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/products/5c151d9d5b1d55194d3209be', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    categories: ['5c151d51eb28fd19457189f6', '5c151d51eb28fd19457189f8'], // Set of ALL categories linked to the product (existing categories + new category or - removed category).
  })
);
```

:::

::: tab "Polymorphic" id="polymorphic"

The polymorphic relationships are the solution when you don't know which kind of model will be associated to your entry. A common use case is an `Image` model that can be associated to many others kind of models (Article, Product, User, etc.).

#### Single vs Many

Let's stay with our `Image` model which might belong to **a single `Article` or `Product` entry**.

**NOTE**:
In other words, it means that an `Image` entry can be associated to one entry. This entry can be a `Article` or `Product` entry.

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

**NOTE**:
In other words, it means that an `Article` entry can relate to the same image as a `Product` entry.

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

The `filter` attribute is optional (but we highly recommend to use it every time). If it's provided it adds a new match level to retrieve the related data.

For example, the `Product` model might have two attributes which are associated to the `Image` model. To distinguish which image is attached to the `cover` field and which images are attached to the `pictures` field, we need to save and provide this to the database.

**Path —** `./api/article/models/Product.settings.json`.

```json
{
  "attributes": {
    "cover": {
      "model": "image",
      "via": "related"
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

**NOTE**:
If you've overridden the default table name given by Strapi by using the `collectionName` attribute. Use the value set in the `collectionName` to name the table.

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
  - **Attempted value:** It corresponds to the id of an `Image` entry.
- `related_id` is using the attribute name where the relation happens with the suffix `_id`.
  - **Attempted value:** It corresponds to the id of an `Article` or `Product` entry.
- `related_type` is using the attribute name where the relation happens with the suffix `_type`.
  - **Attempted value:** It corresponds to the table name where the `Article` or `Product` entry is stored.
- `field` is using the filter property value defined in the model. If you change the filter value, you have to change the name of this column as well.
  - **Attempted value:** It corresponds to the attribute of an `Article`, `Product` with which the `Image` entry is related.

| id  | image_id | related_id | related_type | field  |
| --- | -------- | ---------- | ------------ | ------ |
| 1   | 1738     | 39         | product      | cover  |
| 2   | 4738     | 58         | article      | avatar |
| 3   | 1738     | 71         | article      | avatar |

:::

::::

## Components

Component field let your create a relation between your Content Type and a Component structure.

#### Example

Lets say we created an `openinghours` component in `restaurant` category.

**Path —** `./api/restaurant/models/Restaurant.settings.json`.

```json
{
  "attributes": {
    "openinghours": {
      "type": "component",
      "repeatable": true,
      "component": "restaurant.openinghours"
    }
  }
}
```

- `repeatable` (boolean): Could be `true` or `false` that let you create a list of data.
- `component` (string): It follows this format `<category>.<componentName>`.

:::: tabs

::: tab Create

Create a restaurant with non-repeatable component

```js
const xhr = new XMLHttpRequest();
xhr.open('POST', '/restaurants', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    openinghour: {
      opening_at: '10am',
      closing_at: '6pm',
      day: 'monday',
    },
  })
);
```

Create a restaurant with repeatable component

```js
const xhr = new XMLHttpRequest();
xhr.open('POST', '/restaurants', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    openinghours: [
      {
        opening_at: '10am',
        closing_at: '6pm',
        day: 'monday',
      },
      {
        opening_at: '10am',
        closing_at: '6pm',
        day: 'tuesday',
      },
    ],
  })
);
```

:::

::: tab Update

Update a restaurant with non-repeatable component

```js
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/restaurants/1', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    openinghour: {
      id: 1, // the ID of the entry
      opening_at: '11am',
      closing_at: '7pm',
      day: 'wednesday',
    },
  })
);
```

Update a restaurant with repeatable component

```js
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/restaurants/2', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    openinghours: [
      {
        "id": 1 // the ID of the entry you want to update
        "opening_at": "10am",
        "closing_at": "6pm",
        "day": "monday"
      },
      {
        "id": 2, // you also have to put the ID of entries you don't want to update
        "opening_at": "10am",
        "closing_at": "6pm",
        "day": "tuesday"
      }
    ]
  })
);
```

**NOTE** if you don't specify the `ID` it will delete and re-create the entry the entry, you will see the `ID` value change.

:::

::: tab Delete

Delete a restaurant with non-repeatable component

```js
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/restaurants/1', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    openinghour: null,
  })
);
```

Delete a restaurant with repeatable component

```js
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/restaurants/2', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    openinghours: [
      {
        "id": 1 // the ID of the entry you want to keep
        "opening_at": "10am",
        "closing_at": "6pm",
        "day": "monday"
      }
    ]
  })
);
```

:::

::::

## Dynamic Zone

Dynamic Zone field let your create flexible space to content based on a component list.

#### Example

Lets say we created an `slider` and `content` component in `article` category.

**Path —** `./api/article/models/Article.settings.json`.

```json
{
  "attributes": {
    "body": {
      "type": "dynamiczone",
      "components": ["article.slider", "article.content"]
    }
  }
}
```

- `components` (array): Array of components, that follows this format `<category>.<componentName>`.

:::: tabs

::: tab Create

```js
const xhr = new XMLHttpRequest();
xhr.open('POST', '/articles', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    body: [
      {
        __component: 'article.content',
        content: 'This is a content',
      },
      {
        __component: 'article.slider',
        name: 'Slider name',
      },
    ],
  })
);
```

:::

::: tab Update

```js
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/restaurant/2', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    body: [
      {
        "id": 1 // the ID of the entry you want to update
        "__component": "article.content",
        "content": "This is an updated content",
      },
      {
        "id": 2, // you also have to put the ID of entries you don't want to update
        "__component": "article.slider",
        "name": "Slider name",
      }
    ]
  })
);
```

**NOTE** if you don't specify the `ID` it will delete and re-create the entry the entry, you will see the `ID` value change.

:::

::: tab Delete

```js
const xhr = new XMLHttpRequest();
xhr.open('PUT', '/restaurant/2', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(
  JSON.stringify({
    body: [
      {
        "id": 1 // the ID of the entry you want to keep
        "__component": "article.content",
        "content": "This is an updated content",
      }
    ]
  })
);
```

:::

::::

## Life cycle callbacks

::: warning
The life cycle functions are based on the ORM life cycle and not on the Strapi request.
We are currently working on it to make it easier to use and understand.
Please check [this issue](https://github.com/strapi/strapi/issues/1443) on GitHub.
:::

The following events are available by default:

Callbacks on:

:::: tabs

::: tab save

`save`

- beforeSave
- afterSave

:::

::: tab fetch

`fetch`

- beforeFetch
- afterFetch

::: tab fetchAll

`fetchAll`

- beforeFetchAll
- afterFetchAll

:::

::: tab create

`create`

- beforeCreate
- afterCreate

:::

::: tab update

`update`

- beforeUpdate
- afterUpdate

:::

::: tab destroy

`destroy`

- beforeDestroy
- afterDestroy

:::

::::

### Example

:::: tabs

::: tab Mongoose

#### Mongoose

The entry is available through the `model` parameter.

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
  },
};
```

:::

::: tab Bookshelf

#### Bookshelf

Each of these functions receives three parameters `model`, `attrs` and `options`. You have to return a Promise.

**Path —** `./api/user/models/User.js`.

```js
module.exports = {
  /**
   * Triggered before user creation.
   */
  beforeCreate: async (model, attrs, options) => {
    // Hash password.
    const passwordHashed = await strapi.api.user.services.user.hashPassword(
      model.attributes.password
    );

    // Set the password.
    model.set('password', passwordHashed);
  },
};
```

:::

:::::
