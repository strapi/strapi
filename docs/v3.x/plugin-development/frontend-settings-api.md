# Plugin's front-end settings API

As plugins developer you may need to add some settings into the main application **`Settings`** view (it corresponds to the `Settings` link located in the menu). To do so an API is available in order for a plugin to add links into the main view.

These settings can be declared directly into the main plugin object so they will dynamically be injected into the view.

## Adding a setting

The front-end part of a plugin exports a function which registers the plugin in the administration panel. The argument is composed of two main parameters:

- `registerPlugin`: `Function`
- `settingsBaseURL`: `String`

### Creating the links into the view's menu

Each plugin that comes with a setting object will create a new section into the view's menu.

The menu section can be declared as follows:

**Path —** `plugins/my-plugin/admin/src/index.js`.

```js
import pluginPkg from '../../package.json';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  // Declare the links that will be injected into the settings menu
  const menuSection = {
    // Unique id of the section
    id: pluginId,
    // Title of Menu section using i18n
    title: {
      id: `${pluginId}.foo`,
      defaultMessage: 'Super cool setting',
    },
    // Array of links to be displayed
    links: [
      {
        // Using string
        title: 'Setting page 1',
        to: `${strapi.settingsBaseURL}/${pluginId}/setting1`,
        name: 'setting1',
      },
      {
        // Using i18n with a corresponding translation key
        title: {
          id: `${pluginId}.bar`,
          defaultMessage: 'Setting page 2',
        },
        to: `${strapi.settingsBaseURL}/${pluginId}/setting2`,
        name: 'setting2',
      },
    ],
  };

  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    initializer: () => null,
    injectedComponents: [],
    isReady: true,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: null,
    name: pluginPkg.strapi.name,
    preventComponentRendering: false,
    settings: {
      menuSection,
    },
    trads: {},
  };

  return strapi.registerPlugin(plugin);
};
```

At this point, the plugin creates a new section (**_Super cool setting_**) which will contains two links `Setting page 1` and `Setting page 2` these links don't point to any component as the corresponding one as not been declared yet.

### Declaring the setting Component

The exported Setting component which receives `settingsBaseURL` as props in order to generate a dynamic routing which should be used to associate the two endpoints created with their corresponding components.

With the configuration from above we could easily create our plugin Settings view.

**Path —** `plugins/my-plugin/admin/src/containers/Settings/index.js`.

```js
import React from 'react';
import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';
import pluginId from '../../pluginId';

const SettingPage1 = () => (
  <div>
    <h1>Setting Page 1</h1>
  </div>
);
const SettingPage2 = () => (
  <div>
    <h1>Setting Page 2</h1>
  </div>
);

const Settings = ({ settingsBaseURL }) => {
  return (
    <Switch>
      <Route component={SettingPage1} path={`${settingsBaseURL}/${pluginId}/setting1`} />
      <Route component={SettingPage2} path={`${settingsBaseURL}/${pluginId}/setting2`} />
    </Switch>
  );
};

Settings.propTypes = {
  settingsBaseURL: PropTypes.string.isRequired,
};

export default Settings;
```

Now that the `Settings` component is declared in your plugin the only thing left is to add it to your settings configuration:

**Path —** `plugins/my-plugin/admin/src/index.js`.

```js
import pluginPkg from '../../package.json';
// Import the component
import Settings from './containers/Settings';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  // Declare the links that will be injected into the settings menu
  const menuSection = {
    id: pluginId,
    title: {
      id: `${pluginId}.foo`,
      defaultMessage: 'Super cool setting',
    },
    links: [
      {
        title: 'Setting page 1',
        to: `${strapi.settingsBaseURL}/${pluginId}/setting1`,
        name: 'setting1',
      },
      {
        title: {
          id: `${pluginId}.bar`,
          defaultMessage: 'Setting page 2',
        },
        to: `${strapi.settingsBaseURL}/${pluginId}/setting2`,
        name: 'setting2',
      },
    ],
  };

  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    initializer: () => null,
    injectedComponents: [],
    isReady: true,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: null,
    name: pluginPkg.strapi.name,
    preventComponentRendering: false,
    settings: {
      mainComponent: Settings,
      menuSection,
    },
    trads: {},
  };

  return strapi.registerPlugin(plugin);
};
```

## Adding a setting into the global section

In order to add a link into the global section of the settings view you need to create a global array containing the links you want to add:

**Path —** `plugins/my-plugin/admin/src/index.js`.

```js
import pluginPkg from '../../package.json';
// Import the component
import Settings from './containers/Settings';
import SettingLink from './components/SettingLink';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  // Declare the links that will be injected into the settings menu
  const menuSection = {
    id: pluginId,
    title: {
      id: `${pluginId}.foo`,
      defaultMessage: 'Super cool setting',
    },
    links: [
      {
        title: 'Setting page 1',
        to: `${strapi.settingsBaseURL}/${pluginId}/setting1`,
        name: 'setting1',
      },
      {
        title: {
          id: `${pluginId}.bar`,
          defaultMessage: 'Setting page 2',
        },
        to: `${strapi.settingsBaseURL}/${pluginId}/setting2`,
        name: 'setting2',
      },
    ],
  };

  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    initializer: () => null,
    injectedComponents: [],
    isReady: true,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: null,
    name: pluginPkg.strapi.name,
    preventComponentRendering: false,
    settings: {
      // Add a link into the global section of the settings view
      global: [
        {
          title: 'Setting link 1',
          to: `${strapi.settingsBaseURL}/setting-link-1`,
          name: 'settingLink1',
          Component: SettingLink,
          // Bool : https://reacttraining.com/react-router/web/api/Route/exact-bool
          exact: false,
        },
      ],
      mainComponent: Settings,
      menuSection,
    },
    trads: {},
  };

  return strapi.registerPlugin(plugin);
};
```

::: danger
It is currently not possible to add a link into another plugin's setting section
:::
