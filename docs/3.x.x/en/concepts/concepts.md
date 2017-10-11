# Concepts

  - Table of contents
    - [Controllers](#controllers)
    - [Files structure](#files-structure)
    - [Models](#models)
      - [Attributes](#attributes)
      - [Relations](#relations)
        - [Many-to-many](#many-to-many)
        - [One-to-many](#one-to-many)
        - [One-to-one](#one-to-one)
        - [One-way](#one-way)
      - [Lifecycle callbacks](#lifecycle-callbacks)
    - [Plugin API development](#plugin-api-development)
    - [Plugin data flow](#plugin-data-flow)
    - [Plugin ORM queries](#plugin-orm-queries)
    - [Plugin styles](#plugin-styles)
    - [Policies](#policies)
      - [Global policies](#global-policies)
      - [Scoped policies](#scoped-policies)
      - [Plugin policies](#plugin-policies)
    - [Public assets](#public-assets)
    - [Requests](#requests)
    - [Responses](#responses)
    - [Routing](#routing)
    - [Services](#services)

***

## Controllers

Controllers are JavaScript files which contain a set of methods called **actions** reached by the client according to the requested route. It means that every time a client requests the route, the action performs the business logic coded and sends back the response. They represent the *C* in the *MVC* pattern. In most cases, the controllers will contain the bulk of a project's business logic.

```js
module.exports = {
  // GET /hello
  index: async (ctx) => {
    ctx.send('Hello World!');
  }
};
```

In this example, any time a web browser is pointed to the `/hello` URL on your app, the page will display the text: `Hello World!`.

### Where are defined the controllers?

The controllers are defined in each `./api/**/controllers/` folders. Every JavaScript file put in these folders will be loaded as a controller. They are also available through the `strapi.controllers` and `strapi.api.**.controllers` global variables. By convention, controllers' names should be Pascal-cased, so that every word in the file (include the first one) is capitalized `User.js`, `LegalEntity.js`.

> Please refer to the [controller's guide](../guides/controllers.md) for more informations.

***

## Files structure

TODO

***

## Models

Models are a representation of the database's structure and lifecyle. They are split into two separate files. A JavaScript file that contains the lifecycle callbacks, and a JSON one that represents the data stored in the database and their format. The models also allow you to define the relationships between them.

**Path —** `./api/user/models/User.js`.
```js
module.exports = {
  // Before saving a value.
  // Fired before an `insert` or `update` query.
  beforeSave: (next) => {
    // Use `this` to get your current object
    next();
  },

  // After saving a value.
  // Fired after an `insert` or `update` query.
  afterSave: (doc, next) => {
    next();
  },

  // ... and more
};
```

**Path —** `./api/user/models/User.settings.json`.
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
    }
  }
}
```

In this example, there is a `User` model which contains two attributes `firstname` and `lastname`.


### Where are defined the models?

The models are defined in each `./api/**/models/` folder. Every JavaScript or JSON file put in these folders will be loaded as a model. They are also available through the `strapi.models` and `strapi.api.**.models` global variables. Usable everywhere in the project, they contains the ORM model object that they are referring to. By convention, models' names should be Pascal-cased, so that every word in the file (include the first one) is capitalized `User.js`, `User.settings.json`, `LegalEntity.js`, `LegalEntity.settings.json`.

### Attributes

A model must contain a list of attributes, and each of these attributes must have a type.

> Please refer to the [model's guide for more informations about attributes](../guides/models.md#define-the-attributes).

### Relations

#### Many-to-many

Many-to-many associations allow to link an entry to many entry.

> Please refer to the [many-to-many guide](../guides/models.md#many-to-many)

#### One-to-many

One-way relationships are useful to link an entry to another.

> Please refer to the [one-to-many guide](../guides/models.md#one-to-many)

#### One-to-one

One-way relationships are useful to link an entry to another.

> Please refer to the [one-to-one guide](../guides/models.md#one-to-one).

#### One-way

One-way relationships are useful to link an entry to another. However, only one of the models can be queried with its populated items.

> Please refer to the [one-way guide](../guides/models.md#one-way).

### Lifecycle callbacks

Lifecycle Callbacks are functions triggered at specific moments of the queries.

> Please refer to the [lifecycle callbacks guide](../guides/models.md#lifecycle-callbacks).

***

## Plugin API development

A Plugin can have an API which can be used the same way as an API generated in a Strapi project.

> Please refer to the [plugin development](../plugins/development.md#plugin-api-development) for more informations how it works.

***

## Plugin data flow

Each plugin has its own data store, so it stays completely independent from the others.

Data flow is controlled thanks to [Redux](http://redux.js.org/) and [redux-sagas](https://github.com/redux-saga/redux-saga).

***

## Plugin ORM queries

Strapi supports multiple ORMs in order to let the users choose the database management system that suits their needs. Hence, each plugin must be compatible with at least one ORM.

> Please refer to the [plugin ORM queries](../plugins/development.md#orm-queries) for more informations.

***

## Plugin styles

The admin panel uses [Bootstrap](http://getbootstrap.com/) to be styled on top of solid conventions and reusable CSS classes. Also, it uses [PostCSS](https://github.com/postcss/postcss) and [PostCSS SCSS](https://github.com/postcss/postcss-scss) to keep the code maintainable.

> Please refer to the [plugin development][../plugins/development.md#styles] for detailed informations.

***

## Policies

Policies are functions which have the ability to block a request before it reaches the controller's action.
Each route of the project can be associated to an array of policies, so securing business logic is easy. For example, you can create a policy named `isAdmin`, which obviously checks that the request is sent by an admin user, and use it for critical routes.

Policies can be:
 - `global`: so they can be used within the entire project.
 - `scoped`: used by single API or plugin.

### Where are defined the policies?

The API and plugins policies (scoped) are defined in each `./api/**/config/policies/` folders and plugins. They are respectively exposed through `strapi.api.**.config.policies` and `strapi.plugins.**.config.policies`. The global policies are defined at `./config/policies/` and accessible via `strapi.config.policies`.

> Please refer to the [policy guide](../guides/policies.md)

### Global policies

Global policies are reusable through the entire app.

> Please refer to the [global policy guide](../guides/policies.md#global-policies)

### Scoped policies

A policy defined in an API or plugin is usable only from this API or plugin. You don't need any prefix to use it.

> Please refer to the [scoped policy guide](../guides/policies.md#scoped-policies).

### Plugin policies

Plugin policies are usable from any app API.

> Please refer to the [plugin policy guide](../guides/policies.md#plugins).

## Public Assets

Because an API may need to serve static assets, every new Strapi project includes by default, a folder named `public`. Any file located in this directory is accessible if the request's path doesn't match any other defined route and if it matches a public file name.

#### Example

An image named `company-logo.png` in `./public/` is accessible through `/company-logo.png` URL.

> Note: `index.html` files are served if the request corresponds to a folder name (`/pictures` url will try to serve `./public/pictures/index.html` file).

> Note bis: The dotfiles are not exposed. It means that every files with the names start by `.` such as `.htaccess` or `.gitignore` are not served.


> Please refer to the [public configuration](../configurations/configurations.md#Application) for more informations.

***

## Requests

The context object (`ctx`) contains all the request's related informations.

> Please refer to the [requests guide](../guides/requests.md) for more informations.

***

## Responses

The context object (`ctx`) contains a list of values and functions useful to manage server responses.

> Please refer to the [responses guide](../guides/responses.md) for more informations.

***

## Routing

`routes.json` files define all available routes for the clients.

> Please refer to the [routing guide](../guides/routing.md) for more informations.

***

## Services

Services are a set of reusable functions. They are particularly useful to respect the DRY (don’t repeat yourself) programming concept and to simplify [controllers](#controllers) logic.

> Please refer to the [services guide](../guides/services.md) for more informations.

***
