# Front-end Development

This section explains how to create your plugin interface in the admin panel. Refer to the Plugin Development [Quick Start Section](./quick-start.md) to start the project in development mode.

## Introduction

Strapi's admin panel and plugins system aim to be an easy and powerful way to create new features.

The admin panel is a [React](https://facebook.github.io/react/) application which can embed other React applications. These other React applications are the `admin` parts of each Strapi's plugins.

## Routing

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
See the [Front-end Use Cases](./frontend-use-cases.md#handle-user-navigation) for more informations.

## Data flow

Each plugin has its own data store, so it stays completely independent from the others.

Data flow is controlled thanks to Redux and redux-sagas.

## Styling

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

Use this style in the component: `<div className={styles.wrapper}></div>`.

::: note
if you want to use several classes:
:::

```js
import cn from 'classnames';
import styles from './styles.scss';

// ...

return (
  <div className={cn(styles.wrapper, styles.otherClass)}>{this.props.children}</div>
);

// ...

```

## i18n

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

## Generators

You can use generators to create React components or containers for your plugin.

1. In your terminal go to your plugin folder `cd plugins/my-plugin`
2. Run `npm run generate` and choose the type of component your want to create
