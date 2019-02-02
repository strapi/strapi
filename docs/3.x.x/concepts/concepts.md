# Concepts

  - Table of contents
    - [Files structure](#files-structure)
    - [Controllers](#controllers)
    - [Filters](#filters)
    - [Models](#models)
      - [Attributes](#attributes)
      - [Relations](#relations)
        - [Many-to-many](#many-to-many)
        - [One-to-many](#one-to-many)
        - [One-to-one](#one-to-one)
        - [One-way](#one-way)
      - [Lifecycle callbacks](#lifecycle-callbacks)
    - [Internationalization](#internationalization-and-localization)
    - [Plugin](#plugin)
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

## Files structure

By default, your project's structure will look like this:

- [`/admin`](../advanced/customize-admin.md): contains the vast majority of the admin's front-end and back-end logic.
- `/api`: contains the business logic of your project will be in this folder split in sub-folder per API.
   - `**`
      - `/config`: contains the API's configurations ([`routes`](#routing), [`policies`](#policies), etc).
      - [`/controllers`](#controllers): contains the API's controllers.
      - [`/models`](#models): contains the API's models.
      - [`/services`](#services):  contains the API's services.
- `/node_modules`: contains the npm's packages used by the project.
- [`/config`](../configurations/configurations.md)
  - [`/environments`](../configurations/configurations.md#environments): contains the project's configurations per environment.
    - `/**`
      - `/development`
        - [`custom.json`](../configurations/configurations.md#custom): contains the custom configurations for this environment.
        - [`database.json`](../configurations/configurations.md#database): contains the database connections for this environment.
        - [`request.json`](../configurations/configurations.md#request): contains the request settings for this environment.
        - [`response.json`](../configurations/configurations.md#response): contains the response settings for this environment.
        - [`server.json`](../configurations/configurations.md#server): contains the server settings for this environment.
      - `/production`
      - `/staging`
  - [`/functions`](../configurations/configurations.html#functions): contains lifecycle or generic functions of the project.
  - [`/locales`](../configurations/configurations.html#locales): contains the translation files used by the built-in i18n feature.
  - [`application.json`](../configurations/configurations.html#application): contains the general configurations of the project.
  - [`custom.json`](../configurations/configurations.html#custom): contains the custom configurations of the project.
  - [`hook.json`](../configurations/configurations.html#hook): contains the hook settings of the project.
  - [`language.json`](../configurations/configurations.html#language): contains the language settings of the project.
  - [`middleware.json`](../configurations/configurations.html#middleware): contains the middleware settings of the project.
- [`/hooks`](../advanced/hooks.html): contains the custom hooks of the project.
- [`/middlewares`](../advanced/middlewares.html): contains the custom middlewares of the project.
- [`/plugins`](../configurations/configurations.md#plugins): contains the installed plugins in the project.
- [`/public`](../concepts/concepts.html#public-assets): contains the file accessible to the outside world.


::: note
Inside the `/config` folder, every folder will be parsed and injected into the global object `strapi.config`. Let's say, you added a folder named `credentials` with two files `stripe.json` and `paypal.json` into it. The content of these files will be accessible through `strapi.config.credentials.stripe` and `strapi.config.credentials.paypal`.
:::

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

### Where are the controllers defined?

The controllers are defined in each `./api/**/controllers/` folders. Every JavaScript file put in these folders will be loaded as a controller. They are also available through the `strapi.controllers` and `strapi.api.**.controllers` global variables. By convention, controllers' names should be Pascal-cased, so that every word in the file (include the first one) is capitalized `User.js`, `LegalEntity.js`.

::: note
Please refer to the [controllers' guide](../guides/controllers.md) for more informations.
:::

***

## Filters

Filters are a handy way to request data according to generic parameters. It makes filtering, sorting and paginating easy and reusable (eg. `GET /users?_limit=30&name=John`).

::: note
Please refer to the [filters' guide](../guides/filters.md) for more informations.
:::

***

## Models

Models are a representation of the database's structure and lifecycle. They are split into two separate files. A JavaScript file that contains the lifecycle callbacks, and a JSON one that represents the data stored in the database and their format. The models also allow you to define the relationships between them.

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


### Where are the models defined?

The models are defined in each `./api/**/models/` folder. Every JavaScript or JSON file in these folders will be loaded as a model. They are also available through the `strapi.models` and `strapi.api.**.models` global variables. Usable every where in the project, they contain the ORM model object that they are refer to. By convention, models' names should be written in lowercase.

### Attributes

A model must contain a list of attributes, and each of these attributes must have a type.

::: note
Please refer to the [models' guide for more informations about the attributes](../guides/models.md#define-the-attributes).
:::

### Relations

#### Many-to-many

Many-to-many associations allow to link an entry to many entry.

::: note
Please refer to the [many-to-many guide](../guides/models.md#many-to-many)
:::

#### One-to-many

One-way relationships are useful to link an entry to another.

::: note
Please refer to the [one-to-many guide](../guides/models.md#one-to-many)
:::

#### One-to-one

One-way relationships are useful to link an entry to another.

::: note
Please refer to the [one-to-one guide](../guides/models.md#one-to-one).
:::

#### One-way

One-way relationships are useful to link an entry to another. However, only one of the models can be queried with its populated items.

::: note
Please refer to the [one-way guide](../guides/models.md#one-way).
:::

### Lifecycle callbacks

Lifecycle callbacks are functions triggered at specific moments of the queries.

::: note
Please refer to the [lifecycle callbacks guide](../guides/models.md#lifecycle-callbacks).
:::

***

## Internationalization and localization

Internationalization and localization (i18n) allows to adapt the project to different languages and serve the right content to the users. This feature is deeply integrated into the Strapi's core. It will detect the user language preference (locale) and translate the requested content using the translation files.

::: note
Please refer to the [internationalization's guide](../guides/i18n.md).
:::

***

## Plugin

A plugin is like a fully independent sub-application. It has its own business logic with dedicated models, controllers, services, middlewares or hooks. It can also contain an UI integrated into the admin panel to use it easily. It allows to develop or plugin features in a project in a short time span.

::: note
Please refer to the [plugins documentation](../plugin-development/quick-start.md) for more informations.
:::

***

## Plugin styles

The admin panel uses [Bootstrap](http://getbootstrap.com/) to be styled on top of solid conventions and reusable CSS classes. It is also using [PostCSS](https://github.com/postcss/postcss) and [PostCSS SCSS](https://github.com/postcss/postcss-scss) to keep the code maintainable.

::: note
Please refer to the [plugin front-end development](../plugin-development/frontend-development.md#styling) for detailed informations.
:::

***

## Policies

Policies are functions which have the ability to execute specific logic on each request before it reaches the controller's action. They are mostly used for securing business logic easily.
Each route of the project can be associated to an array of policies. For example, you can create a policy named `isAdmin`, which obviously checks that the request is sent by an admin user, and use it for critical routes.

Policies can be:
 - `global`: so they can be used within the entire project.
 - `scoped`: used by single API or plugin.

### Where are the policies defined?

The API and plugins policies (scoped) are defined in each `./api/**/config/policies/` folders and plugins. They are respectively exposed through `strapi.api.**.config.policies` and `strapi.plugins.**.config.policies`. The global policies are defined at `./config/policies/` and accessible via `strapi.config.policies`.

::: note
Please refer to the [policy guide](../guides/policies.md)
:::

### Global policies

Global policies are reusable through the entire app.

::: note
Please refer to the [global policy guide](../guides/policies.md#global-policies)
:::

### Scoped policies

A policy defined in an API or plugin is usable only from this API or plugin. You don't need any prefix to use it.

::: note
Please refer to the [scoped policy guide](../guides/policies.md#scoped-policies).
:::

### Plugin policies

Plugin policies are usable from any app API.

::: note
Please refer to the [plugin policy guide](../guides/policies.md#plugins).
:::

## Public Assets

Public assets are static files such as images, video, css, etc that you want to make accessible to the outside world. Every new project includes by default, a folder named `./public`.

::: note
Please refer to the [public configuration](../configurations/configurations.md#Application) for more informations.
:::

***

## Requests

The context object (`ctx`) contains all the request's related informations.

::: note
Please refer to the [requests guide](../guides/requests.md) for more informations.
:::

***

## Responses

The context object (`ctx`) contains a list of values and functions useful to manage server responses.

::: note
Please refer to the [responses guide](../guides/responses.md) for more informations.
:::

***

## Routing

`./api/**/config/routes.json` files define all available routes for the clients.

::: note
Please refer to the [routing guide](../guides/routing.md) for more informations.
:::

***

## Services

Services are a set of reusable functions. They are particularly useful to respect the DRY (don’t repeat yourself) programming concept and to simplify [controllers](#controllers) logic.

::: note
Please refer to the [services guide](../guides/services.md) for more informations.
:::

***
