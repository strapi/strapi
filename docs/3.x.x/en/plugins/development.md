# Development

Any Strapi plugin can contain two parts: an [API](#plugin-api-development) and a [plugin admin interface](#plugin-admin-interface-development). This section explains how to change each of these two parts after plugin creation, or modify an existing plugin.

<!-- See the [strapi-generate](../cli/CLI.md#strapi-generateplugin) part to check the dedicated Strapi's command line. -->

***

## Back-end

This section explains how the 'backend part' of your plugin works.

Table of contents:
  - [Folders and files structure](#folders-and-files-structure)
  - [Routes](#routes)
  - [CLI](#cli)
  - [Controllers](#controllers)
  - [Models](#models)
  - [Policies](#policies)
  - [ORM queries](#orm-queries)

### Folders and files structure

The logic of a plugin is located at his root directory `./plugins/**`. The folders and files structure is the following:
```
/plugin
└─── admin // Contains the plugin's front-end
└─── config // Contains the configurations of the plugin
|    └─── routes.json // Contains the plugin's API routes
└─── controllers // Contains the plugin's API controllers
└─── models // Contains the plugin's API models
└─── services // Contains the plugin's API services
```

### Routes

The plugin API routes are defined in the `./plugins/**/config/routes.json` file.

> Please refer to [router documentation](../guides/routing.md) for informations.

**Route prefix**

Each route of a plugin is prefixed by the name of the plugin (eg: `/my-plugin/my-plugin-route`).

To disable the prefix, add the `prefix` attribute to each concerned route, like below:
```json
{
  "method": "GET",
  "path": "/my-plugin-route",
  "handler": "MyPlugin.action",
  "prefix": false
}
```

### CLI

The CLI can be used to generate files in the plugins folders.

Please refer to the [CLI documentation](../cli/CLI.md) for more informations.

### Controllers

Controllers contain functions executed according to the requested route.

Please refer to the [Controllers documentation](../guides/controllers.md) for more informations.

### Models

A plugin can have its own models.

Please refer to the [Models documentation](../guides/models.md) for more informations.

### Policies

#### Global policies

A plugin can also use a globally exposed policy in the current Strapi project.

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

#### Plugin policies

A plugin can have its own policies, such as adding security rules. For instance, if the plugin includes a policy named `isAuthenticated`, the syntax to use this policy would be:

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

Please refer to the [Policies documentation](../guides/policies.md) for more informations.

### ORM queries

Strapi supports multiple ORMs in order to let the users choose the database management system that suits their needs. Hence, each plugin must be compatible with at least one ORM. Each plugin contains a folder named `queries` in `./plugins/**/api/queries`. A folder must be created for each ORM (eg. `mongoose`) with a file named `mongoose.js` which exports the Mongoose ORM related queries.

The queries are accessible through the `strapi.query()` method, which automatically contains the queries according to the ORM used by the model.

#### Example

Mongoose ORM queries definition:

**Path —** `./plugins/my-plugin/api/config/queries/mongoose/index.js`.
```js
module.exports = {
  getUsers: async (params) => {
    return User.find(params);
  }
}
```

Bookshelf ORM queries definition:

**Path —** `./plugins/my-plugin/api/config/queries/bookshelf/index.js`.
```js
module.exports = {
  getUsers: async (params) => {
    return User.fetchAll(params);
  }
}
```

Usage from the plugin:

**Path —** `./plugins/my-plugin/api/controllers/index.js`.
```js
module.exports = {
  getUsers: async () => {
    // Get parameters from the request
    const { limit, sort } = ctx.request.query;

    // Get the list of users using the plugins queries
    const users = await strapi.query('User').getUsers({ limit, sort });

    // Send the list of users as response
    ctx.body = users;
  }
}
```

#### Advanced usage

Each function in the query file is bound with the ORM's model. It means that you can create generic query very easily. This feature is useful for CRUD such as we did in the [Content Manager plugin](https://github.com/strapi/strapi/tree/alpha.6/packages/strapi-plugin-content-manager/config/queries).

Mongoose ORM generic queries:

**Path —** `./plugins/my-plugin/api/config/queries/mongoose/index.js`.
```js
module.exports = {
  getAll: async function (params) {
    // this refers to the Mongoose model called in the query
    // ex: strapi.query('User').getAll(), this will be equal to the User Mongoose model.
    return this.find(params);
  }
}
```

Bookshelf ORM generic queries:

**Path —** `./plugins/my-plugin/api/config/queries/bookshelf/index.js`.
```js
module.exports = {
  getAll: async function (params) {
    // this refers to the Bookshelf model called in the query
    // ex: strapi.query('User').getAll(), this will be equal to the User Bookshelf model.
    return this.fetchAll(params);
  }
}
```

Usage from the plugin:

**Path —** `./plugins/my-plugin/api/controllers/index.js`.
```js
module.exports = {
  getUsers: async () => {
    // Get parameters from the request
    const { limit, sort } = ctx.request.query;

    // Get the list of users using the plugin's queries
    const users = await strapi.query('User').getAll({ limit, sort });

    // Send the list of users as response
    ctx.body = users;
  }
}
```
***

## Front-end

This section explains how to create your plugin interface in the admin panel.

Table of contents:
- [Development mode](#start-the-project-in-development-mode)
- [Folders and files structure](#folders-and-file-structure)
- [Routing](#routing)
- [Using Redux/sagas](#using-redux-sagas)
- [i18n](#i18n)
- [Styling](#styles)
- [Data flow](#data-flow)
- [API Reference](#api-reference)
- [Tutorial](#tutorial)

### Introduction

Strapi's admin panel and plugins system aim to be an easy and powerful way to create new features.

The admin panel is a [React](https://facebook.github.io/react/) application which can embed other React applications. These other React applications are the `admin` parts of each Strapi's plugins.

### Start the project in development mode

To start the project in development mode, read the [Contributing Guide](https://github.com/strapi/strapi/blob/master/.github/CONTRIBUTING.md).

### Folders and files structure

The admin panel related parts of each plugin is contained in the `./plugins/my-plugin/admin` folder it has the following structure:

```
/admin
└─── build // Webpack build of the plugin
└─── src // Source code directory
|    └─── bootstrap.js // (Optional) Contains the logic to execute before rendering the plugin
|    └─── components // Contains the list of React components used by the plugin
|    └─── containers
|    |    └─── App // Container used by every others containers
|    |    └─── HomePage
|    |         └─── action.js // List of Redux actions used by the current container
|    |         └─── constants.js // List of actions constants
|    |         └─── index.js // React component of the current container
|    |         └─── reducer.js // Redux reducer used by the current container
|    |         └─── sagas.js // List of sagas functions
|    |         └─── selectors.js // List of selectors
|    |         └─── styles.scss // Style of the current container
|    |
|    └─── requirements.js // (Optional) Contains the logic to prevent a plugin from being rendered
|    └─── translations // Contains the translations to make the plugin internationalized
|         └─── en.json
|         └─── fr.json
└─── package.json // List of the necessary npm dependencies
```

### Routing

The routing is based on the [React Router V4](https://reacttraining.com/react-router/web/guides/philosophy), due to it's implementation each route is declared in the `containers/App/index.js` file.

Also, we chose to use the [Switch Router](https://reacttraining.com/react-router/web/api/Switch) because it renders a route exclusively.

**Route declaration :**

Let's say that you want to create a route `/user` with params `/:id` associated with the container UserPage.

The declaration would be as followed :

**Path —** `plugins/my-plugin/admin/src/containers/App/index.js`.
```js
import React from 'react';
import UserPage from 'containers/UserPage';

// ...

class App extends React.Component {
  // ...

  render() {
    return (
      <div className={styles.myPlugin}>
        <Switch>
          <Route exact path="/plugins/my-plugin/user/:id" component={UserPage} />
        </Switch>
      </div>
    );
  }
}

// ...
```
See the [advanced user navigation guide](./advanced.md#handle-user-navigation) for more informations.

### Using Redux sagas

Due to React Router V4 your container's store is not directly injected.
To inject your container's store if it's associated with a route you have to do it manually.

As an example, you created a FooPage container associated with the route `/plugins/my-plugin/bar`, and you want to use redux/action/reducer/sagas.

Your `plugins/my-plugin/admin/src/containers/App/index.js` file will look as follows :

```js
render() => (
  <div className={styles.myPlugin}>
    <Switch>
      <Route exact path="/plugins/my-plugin/bar" component={FooPage} />
    </Switch>
  </div>
);
```

And the `plugins/my-plugin/admin/src/containers/FooPage/index.js` file will be :

```js
import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import PropTypes from 'prop-types';

// Utils to create your container store
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import {
  foo,
  bar,
} from './actions';
import reducer from './reducer';
import saga from './sagas';
import { makeSelectFooPage } from './selectors';

// Styles
import styles from './styles.scss';

export class FooPage extends React.Component {
  render() {
    return (
      <div className={styles.fooPage}>
        Awesome container
      </div>
    );
  }
}

FooPage.propTypes = {
  fooPage: PropTypes.any,
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      foo,
      bar,
    },
    dispatch
  );
}

const mapStateToProps = createStructuredSelector({
  fooPage: makeSelectFooPage(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

// This is where you create your container's store
// the key must correspond to your container name in camelCase
const withSagas = injectSaga({ key: 'fooPage', saga });
const withReducer = injectReducer({ key: 'fooPage', reducer });

export default compose(
  withReducer,
  withSagas,
  withConnect,
)(FooPage);
```


Important: see the [advanced container store injection](./advanced.md#routeless-container-store-injection.md) for more informations about how to create your container's store.

### i18n

[React Intl](https://github.com/yahoo/react-intl) provides React components and an API to format dates, numbers, and strings, including pluralization and handling translations.

**Usage**

We recommend to set all your components text inside the translations folder.

The example below shows how to use i18n inside your plugin.

**Define all your ids with the associated message:**

**Path —** `./plugins/my-plugin/admin/src/translations/en.json`.
```json
{
  "notification.error.message": "An error occurred"
}
```

**Path —** `./plugins/my-plugin/admin/src/translations/fr.json`
```json
{
  "notification.error.message": "Une erreur est survenue"
}
```

**Usage inside a component**

**Path —** `./plugins/my-plugin/admin/src/components/Foo/index.js`.
```js
import { FormattedMessage } from 'react-intl';
import SomeOtherComponent from 'components/SomeOtherComponent';

const Foo = (props) => (
  <div className={styles.foo}>
    <FormattedMessage id="my-plugin.notification.error.message" />
    <SomeOtherComponent {...props} />
  </div>
)

export default Foo;
```

See [the documentation](https://github.com/yahoo/react-intl/wiki/Components#formattedmessage) for more extensive usage.

### Styles

The [Bootstrap styles](http://getbootstrap.com/) are inherited by the plugins. However, each component has its own styles, so it possible to completely customize it.

**See the [plugin styles](../concepts/concepts.md#plugin-styles) for informations on its concept.**

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

Use this style from the component: `<div className={styles.wrapper}></div>`.

Note: if you want to use several classes:

```js
import cn from 'classnames';

// ...

return (
  <div className={cn(styles.wrapper, styles.otherClass)}>{this.props.children}</div>
);

// ...

```

### Data flow

Each plugin has its own data store, so it stays completely independent from the others.

Data flow is controlled thanks to Redux and redux-sagas.

### API Reference

> Refer to the [plugin registration](../api-reference/reference.md#plugin-registration) for details.

### Tutorial

For more information, try the [Create your first Strapi plugin](http://strapi.io) tutorial.
