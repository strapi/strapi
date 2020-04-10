# Plugin's front-end Component API

As plugins developer you may need to add custom components in your application so other plugin may use them. To do so, a **Component API** is available in order for a plugin to register a component which will be available for all plugins.

## Registering a new component

Registering a component can be made in two different ways:

1. During the load phase of a plugin
2. Using the provided `react-hook` in a component.

### Registering a component during the load of a plugin

Registering a component during the load phase of a plugin can be done as follows:

1. Create a new Field type (in this example a **`media`** field type):

**Path —** `plugins/my-plugin/admin/src/components/MyComponent/index.js`.

```js
import React from 'react';

const MyComponent = () => {
  return <div>MyComponent</div>;
};

export default MyComponent;
```

2. Register the field into the application:

**Path —** `plugins/my-plugin/admin/src/index.js`.

```js
import pluginPkg from '../../package.json';
import MyComponent from './components/MyComponent';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

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
    trads: {},
  };

  strapi.registerComponent({ name: 'my-component', Component: MyComponent });

  return strapi.registerPlugin(plugin);
};
```

By doing so, all the plugins from your project will be able to use the newly registered **Component**.

### Registering a component inside a React Component

The other way to register a **Component** is to use the provided `react-hook`: **`useStrapi`** it can be done in the `Initializer` Component so it is accessible directly when the user is logged in, if you decide to register your plugin in another component than the `Initializer` the **Component** will only be registered in the administration panel once the component is mounted (the user has navigated to the view where the **Component** is registered).

1. Register the **Component** in the `Initializer` Component:

**Path —** `plugins/my-plugin/admin/src/containers/Initializer/index.js`.

```js
/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useStrapi } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import MyComponent from './components/MyComponent';

const Initializer = ({ updatePlugin }) => {
  const {
    strapi: { componentApi },
  } = useStrapi();
  const ref = useRef();
  ref.current = updatePlugin;

  useEffect(() => {
    // Register the new component
    strapi.componentApi.registerComponent({ name: 'my-component', Component: MyComponent });

    ref.current(pluginId, 'isReady', true);
  }, []);

  return null;
};

Initializer.propTypes = {
  updatePlugin: PropTypes.func.isRequired,
};

export default Initializer;
```

2. Add the `Initializer` component to your plugin so it is mounted in the administration panel once the user is logged in:

```js
import pluginPkg from '../../package.json';
import pluginLogo from './assets/images/logo.svg';
import App from './containers/App';
import Initializer from './containers/Initializer';
import lifecycles from './lifecycles';
import trads from './translations';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;
  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    initializer: Initializer,
    injectedComponents: [],
    isRequired: pluginPkg.strapi.required || false,
    layout: null,
    lifecycles,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: App,
    name: pluginPkg.strapi.name,
    pluginLogo,
    preventComponentRendering: false,
    trads,
  };

  return strapi.registerPlugin(plugin);
};
```

## Consuming the Component API

Consuming the **Component** API can only be done by using the provided `react-hook` **`useStrapi`**.

## Component API definition

| Method            | Param         | Description                                |
| :---------------- | :------------ | :----------------------------------------- |
| getComponent      | {String} name | Retrieve a Component depending on the name |
| getComponents     |               | Retrieve all the Components                |
| registerComponent | {Object}      | Register a Component                       |
| removeComponent   |               | Remove a Component                         |
