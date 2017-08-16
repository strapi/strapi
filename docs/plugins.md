# Plugins documentation

## Plugin installation

Allows the developer to install a plugin, using the CLI.

### Basic usage

Considering you want to install a plugin named `content-manager` you can run the following command:
`$ strapi install content-manager`.

This supposed that this plugin is published on the npm registry as `strapi-plugin-content-manager`.

The command installs the plugin in the `node_modules` folder of your Strapi application, and then, move the plugin itself in the `./plugins` folder, so you can edit and version it.

### Development mode

In order to make contributors life easier, a command is dedicated to development mode:
`$ strapi install plugin-name --dev` (eg. `$ strapi install content-manager --dev`)

This command creates a symlink between the Strapi application and the plugin, which should have been previously installed globally (`$ npm link` or `$ npm install plugin-name -g`).

## Plugin creation

Because you have specific requirements in your Strapi project, or because you want to publish a new plugin for the community, you may want to create a new Strapi plugin.

To generate a new plugin, use `$ strapi generate:plugin my-plugin`.

This will create necessary files in `./plugins/my-plugin` folder.

## Plugin development

Any Strapi plugin can contain two parts: an API and a plugin admin interface. The section explains how to change each of these two parts after plugin creation, or in order to modify an existing plugin.

### Plugin API development

A plugin can have an API, which can be used exactly the same way that an API generated in a Strapi project.

#### Introduction

#### Folders and files structure

The API logic of a plugin is located in `./plugins/content-manager`.

The folders and files structure is the following:
 - `admin`: contains the files related to the display in the admin panel
 - `config`: contains the config of the plugin
  - `routes.json`: contains the list of routes of the plugin API
 - `controllers`: contains the controllers of the plugin API
 - `models`: contains the models of the plugin API
 - `services`: contains the services of the plugin API

#### Routes

Plugins routes are listed and editable in `./plugins/my-plugin/config/routes.json`.

Please refer to [router documentation](http://strapi.io) to change the routes configuration.

*Routes prefix:*

Each routes of a plugin is prefixed by the name of the plugin (eg: `/my-plugin/my-plugin-route`).

To disable the prefix, add the `prefix` attribute to each concerned route, like below:
```json
{
  "method": "GET",
  "path": "/my-plugin-route",
  "handler": "MyPlugin.action",
  "prefix": false
}
```

#### CLI

The CLI can be used to generate files in the plugins folders.

Please refer to the [CLI documentation](http://strapi.io) for more information.

#### Controllers

Controllers contains functions executed according to routes requested.

Please refer to the [Controllers documentation](http://strapi.io) for more information.

#### Models

A plugin can have its own models.

Please refer to the [Models documentation](http://strapi.io) for more information.

#### Policies

##### Plugin policies

A plugin can have its own policies, typically in order to add security rules. Supposing the plugin includes a policy named `isAuthenticated`, here is the syntax to use this policy.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "MyPlugin.index",
      "config": {
        "policies": [
          "plugins.myPlugin.isAuthenticated"
        ]
      }
    }
  ]
}
```

##### Global policies

A plugin can also use a policy exposed globally in the current Strapi project.

```json
{
  "routes": [
    {
      "method": "GET",
      "path": "/",
      "handler": "MyPlugin.index",
      "config": {
        "policies": [
          "global.isAuthenticated"
        ]
      }
    }
  ]
}
```

#### ORM queries

Strapi supports multiple ORM in order to let the users choose the database management systems that suit their needs. Because of that, each plugin must be compatible with at least one ORM. That's why each plugin contains a folder named `queries` in `./plugins/my-plugin/api/queries`.

A folder must be created for each ORM (eg. `mongoose`) with a file named `index.js` which exports the Mongoose ORM related queries.

The queries are accessible through `strapi.plugins.myPlugin.queries` object, which automatically contains the queries according to the ORM used by the model.

Example:

Mongoose ORM queries definition:
```js
// ./plugins/my-plugin/api/config/queries/mongoose/index.js
module.exports = {
  getUsers: async(params) => {
    return User.find(params);
  }
}
```

Bookshelf ORM queries definition:
```js
// ./plugins/my-plugin/api/config/queries/bookshelf/index.js
module.exports = {
  getUsers: async(params) => {
    return User.fetchAll(params);
  }
}
```

Usage from the plugin:
```js
// ./plugins/my-plugin/api/controllers/index.js
module.exports = {
  getUsers: async() => {
    // Get parameters from the request
    const {limit, sort} = ctx.request.query;

    // Get the list of users using the plugins queries
    const users = await strapi.plugins.myPlugin.config.queries.getUsers({limit, sort});

    // Send the list of users as response
    ctx.body = users;
  }
}
```

### Plugin admin interface development

#### Introduction

Strapi admin panel and plugins attend to be an easy and powerful way to create new features usable from the admin panel.

The admin panel is a [React](https://facebook.github.io/react/) application which can embed other React applications. These other React applications are actually the `admin` parts of each Strapi plugins.

#### Start the project in development mode

To start the project in development mode:
 - Open a new tab in you terminal
 - Move to the `./plugins/my-plugin` folder
 - For the moment `npm link strapi-helper-plugin`
 - Install the dependencies: `npm install`
 - Start the project: `npm start`
 - Open the admin panel in your web browser: [http://localhost:1337](http://localhost:1337)
 - You should now be able to see the plugin in development mode

Explanations: by doing the steps above, you start a Webpack (to build the assets) and an Express server (exposing the assets, running on port `3000`). The admin panel automatically detects if a process is running on port `3000`. If it does, it load the `main.js` file which is, by default, the name of the build. This system enable hot reload to make developers life easier.

Note: currently, you can develop only one plugin at a time.

#### Folders and files structure

The admin panel related part of each plugin is contained in `./plugins/my-plugin/admin` folder. Here is its following structure:
 - `app`: source code directory
   - `components`: contains the list of React components used by the plugin
   - `containers`
    - `App`: container used by every other containers
    - `HomePage`
      - `actions.js`: list of [Redux actions](http://redux.js.org/docs/basics/Actions.html) used by the current container
      - `constants.js`: list of actions constants
      - `index.js`: React component of the current container
      - `messages.js`: list of messages for translations (optional)
      - `reducer.js`: list of [Redux reducers](http://redux.js.org/docs/basics/Reducers.html) used by the current container
      - `sagas.js`: list of [redux-sagas functions](https://github.com/redux-saga/redux-saga) used by the current container (optional)
      - `selectors.js`: list of [selectors](https://github.com/reactjs/reselect) used by the current container
      - `styles.scss`: style of the current container (optional)
    - `AboutPage`: secondary page
   - `translations`: contains the translations to make the plugin internationalized
    - `de.json`
    - `en.json`
    - `fr.json`
   - `routes.json`: file containing the list of routes of the plugin
 - `build`: Webpack build of the plugin
 - `package.json`: list of the necessary npm dependencies

#### Routing

In order to make developers life easier, the list of routes is listed in a simple JSON file.

The `key` of each object must be the route pattern. Each route must be related to a `container` located in the `containers` folder, and must have a `name`.

```json
// ./plugins/my-plugin/admin/app/routes.json
{
  "/": {
    "name": "home",
    "container": "HomePage"
  },
  "/about": {
    "name": "about",
    "container": "AboutPage"
  }
}
```

#### Styles

The admin panel uses [Bootstrap](http://getbootstrap.com/) to be styled on top of solid conventions and reusable CSS classes. Also, it uses [PostCSS](https://github.com/postcss/postcss) and [PostCSS SCSS](https://github.com/postcss/postcss-scss) to keep the code maintainable.

The styles are inherited by the plugins. However, each component have its own styles, so it possible to completely customize it.

To style a plugin component:
 - Add a `styles.scss` file in the component directory
 - Require it from the `index.js` file (`import styles from './styles.scss';`)
 - Add some styles in the `styles.scss` file
```
.wrapper {
  display: block;
  background: red;
  height: 100px;
  width: 100px;
}
```
 - Use this style from the component: `<div className={styles.wrapper}></div>` (or ``<div className={`${styles.wrapper} ${styles.otherClass}`}></div>`` if you want to use many classes)

#### Data flow

Each plugin has its own data store, so it stays completely independent from the others.

Data flow is controlled thanks to [Redux](http://redux.js.org/) and [redux-sagas](https://github.com/redux-saga/redux-saga).

#### API Reference

To make plugin registration possible through the front-end, a `Strapi` object is exposed in `window`.

The object contains a set of functions and properties useful for the plugins.

##### `register` - Register a new plugin

[Think about window.strapi possible improvements]

#### Tutorial

For more information, try the [Create your first Strapi plugin](http://strapi.io) tutorial.

## Plugin uninstallation

Allows the developer to uninstall a plugin, using the CLI.

### Basic usage
Command: `$ strapi uninstall plugin-name` (eg. `$ strapi uninstall content-manager`).

This command simply removes the plugin folder.

Please refer to the [CLI documentation](http://strapi.io) for more information.
