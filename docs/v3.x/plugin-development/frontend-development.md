# Front-end Development

Strapi's admin panel and plugins system aim to be an easy and powerful way to create new features.

The admin panel is a [React](https://facebook.github.io/react/) application which can embed other React applications. These other React applications are the `admin` parts of each Strapi's plugins.

## Environment setup

To enable local plugin development, you need to start your application with the front-end development mode activated:

:::: tabs

::: tab yarn

```bash
$ cd my-app
$ yarn develop --watch-admin
```

:::

::: tab npm

```bash
$ cd my-app
$ npm run develop -- --watch-admin
```

:::

::::

## API

### Strapi global variable

The administration exposes a global variable that is accessible for all the plugins.

#### `strapi.backendURL`

Retrieve the back-end URL. (e.g. `http://localhost:1337`).

#### `strapi.currentLanguage`

Retrieve the administration panel default language (e.g. `en-US`)

#### `strapi.languages`

Array of the administration panel's supported languages. (e.g. `['ar', 'en', 'fr', ...]`).

#### `strapi.lockApp()`

Display a loader that will prevent the user from interacting with the application.

#### `strapi.unlockApp()`

Remove the loader so the user can interact with the application

#### `strapi.notification`

Use this command anywhere in your code.

```js
strapi.notification.toggle(config);
```

The properties of the config object are as follows:

| key             | type          | default                  | Description                                                                                                                  |
| --------------- | ------------- | ------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| type            | string        | success                  | `success`, `warning` or `info`                                                                                               |
| message         | object/string | app.notification.success | The main message to display (works with i18n message object, `{ id: 'app.notification.success', defaultMessage: 'Saved!' }`) |
| title           | object/string | null                     | Add a title to the notification                                                                                              |
| link            | object        | null                     | Add a link to the notification message `{ url: String, label: String|Object }`                                               |
| timeout         | number        | 2500                     | Time in ms before the notification is closed                                                                                 |
| blockTransition | boolean       | false                    | Block the notification transitions to remove the timeout                                                                     |
| uid             | string        | null                     | Custom the notification uid                                                                                                  |

The previous notification API is still working but will display a warning message in the console

```js
strapi.notification.error('app.notification.error');
strapi.notification.info('app.notification.info');
strapi.notification.success('app.notification.success');
strapi.notification.warning('app.notification.warning');
```

#### `strapi.remoteURL`

The administration url (e.g. `http://localhost:4000/admin`).

### Main plugin object

Each plugin exports all its configurations in an object. This object is located in `my-plugin/admin/src/index.js`

Here are its properties:

| key                       | type    | Description                                                                                                                                                                                                             |
| ------------------------- | ------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| blockerComponent          | node    | Props can be either `null` or React node (e.g. `() => <div />`)                                                                                                                                                         |
| blockerComponentProps     | object  | Props to provide to customise the [blockerComponent](https://github.com/strapi/strapi/blob/58588e10e5d15921b0966e20ce1bc6cde70df5cc/packages/strapi-helper-plugin/lib/src/components/BlockerComponent/index.js#L81-L86) |
| description               | string  | Plugin's description retrieved from the package.json                                                                                                                                                                    |
| id                        | string  | Id of the plugin from the `package.json`                                                                                                                                                                                |
| initializer               | node    | Refer to the [Initializer documentation](#initializer)                                                                                                                                                                  |
| injectedComponents        | array   | Refer to the [Injected Component documentation](#injected-components)                                                                                                                                                   |
| isReady                   | boolean | The app will load until this property is true                                                                                                                                                                           |
| mainComponent             | node    | The plugin's App container,                                                                                                                                                                                             |
| menu                      | object  | Define where the link of your plugin will be set. Without this your plugin will not display a link in the left menu                                                                                                     |
| name                      | string  | The plugin's name retrieved from the package.json                                                                                                                                                                       |
| pluginLogo                | file    | The plugin's logo                                                                                                                                                                                                       |
| preventComponentRendering | boolean | Whether or not display the plugin's blockerComponent instead of the main component                                                                                                                                      |
| settings                  | object  | Refer to the [Plugins settings API](./frontend-settings-api.md)                                                                                                                                                         |
| reducers                  | object  | The plugin's redux reducers                                                                                                                                                                                             |
| trads                     | object  | The plugin's translation files                                                                                                                                                                                          |

### Displaying the plugin's link in the main menu

To display a plugin link into the main menu the plugin needs to export a menu object.

**Path —** `plugins/my-plugin/admin/src/index.js`.

```js
import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import lifecycles from './lifecycles';
import trads from './translations';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
  const icon = pluginPkg.strapi.icon;
  const name = pluginPkg.strapi.name;
  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon,
    id: pluginId,
    initializer: null,
    isRequired: pluginPkg.strapi.required || false,
    layout: null,
    lifecycles,
    mainComponent: App,
    name,
    pluginLogo,
    preventComponentRendering: false,
    trads,
    menu: {
      // Set a link into the PLUGINS section
      pluginsSectionLinks: [
        {
          destination: `/plugins/${pluginId}`, // Endpoint of the link
          icon,
          label: {
            id: `${pluginId}.plugin.name`, // Refers to a i18n
            defaultMessage: 'My PLUGIN',
          },
          name,
          // If the plugin has some permissions on whether or not it should be accessible
          // depending on the logged in user's role you can set them here.
          // Each permission object performs an OR comparison so if one matches the user's ones
          // the link will be displayed
          permissions: [{ action: 'plugins::content-type-builder.read', subject: null }],
        },
      ],
    },
  };

  return strapi.registerPlugin(plugin);
};
```

### Initializer

The component is generated by default when you create a new plugin. Use this component to execute some logic when the app is loading. When the logic has been executed this component should emit the `isReady` event so the user can interact with the application.

::: tip NOTE
Below is the Initializer component of the content-type-builder plugin.

It checks whether or not the auto-reload feature is enabled and depending on this value changes the mainComponent of the plugin.
:::

```js
/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import pluginId from '../../pluginId';

class Initializer extends React.PureComponent {
  // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    const {
      admin: { autoReload, currentEnvironment },
    } = this.props;

    let preventComponentRendering;
    let blockerComponentProps;

    if (currentEnvironment === 'production') {
      preventComponentRendering = true;
      blockerComponentProps = {
        blockerComponentTitle: 'components.ProductionBlocker.header',
        blockerComponentDescription: 'components.ProductionBlocker.description',
        blockerComponentIcon: 'fa-ban',
        blockerComponentContent: 'renderButton',
      };
    } else {
      // Don't render the plugin if the server autoReload is disabled
      preventComponentRendering = !autoReload;
      blockerComponentProps = {
        blockerComponentTitle: 'components.AutoReloadBlocker.header',
        blockerComponentDescription: 'components.AutoReloadBlocker.description',
        blockerComponentIcon: 'fa-refresh',
        blockerComponentContent: 'renderIde',
      };
    }

    // Prevent the plugin from being rendered if currentEnvironment === PRODUCTION
    this.props.updatePlugin(pluginId, 'preventComponentRendering', preventComponentRendering);
    this.props.updatePlugin(pluginId, 'blockerComponentProps', blockerComponentProps);
    // Emit the event plugin ready
    this.props.updatePlugin(pluginId, 'isReady', true);
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  admin: PropTypes.object.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

export default Initializer;
```

### Injected Components

(Coming soon)

### Routing

The routing is based on the [React Router V5](https://reacttraining.com/react-router/web/guides/philosophy), due to it's implementation each route is declared in the `containers/App/index.js` file.

::: tip
Each route defined in a plugin must be prefixed by the plugin's id.
:::

**Route declaration :**

Let's say that you want to create a route `/user` with params `/:id` associated with the container UserPage.

The declaration would be as follows :

**Path —** `plugins/my-plugin/admin/src/containers/App/index.js`.

```js
import React from 'react';
import pluginId from '../../pluginId';

import UserPage from '../UserPage';

// ...

class App extends React.Component {
  // ...

  render() {
    return (
      <div>
        <Switch>
          <Route exact path={`/plugins/${pluginId}/user/:id`} component={UserPage} />
        </Switch>
      </div>
    );
  }
}

// ...
```

### Styling

The administration panel uses [styled-components](https://styled-components.com/) for writing css.

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

const Foo = props => (
  <div className={styles.foo}>
    <FormattedMessage id="my-plugin.notification.error.message" />
    <SomeOtherComponent {...props} />
  </div>
);

export default Foo;
```

See [the documentation](https://github.com/yahoo/react-intl/wiki/Components#formattedmessage) for more extensive usage.

### Global context

All plugins are wrapped inside the `GlobalContextProvider`, in this object you will have access to all plugins object as well as other utilities.

Usage:

**Inside a functional component:**

```js
import React from 'react';
import { useGlobalContext } from 'strapi-helper-plugin';

const Foo = () => {
  const globalContext = useGlobalContext();

  console.log(globalContext);

  return <div>Foo</div>;
};
```

**Inside a class component:**

```js
import React from 'react';
import { GlobalContext } from 'strapi-helper-plugin';

class Foo extends React.Component {
  static contextType = GlobalContext;

  render() {
    console.log(this.context);

    return <div>Foo</div>;
  }
}
```
