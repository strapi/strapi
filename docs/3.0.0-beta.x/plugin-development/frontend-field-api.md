# Plugin's front-end Field API

As plugins developer you may need to add custom fields in your application. To do so, a **Field API** is available in order for a plugin to register a field which will be available for all plugins.

::: warning NOTE

Currently, only the content manager uses this API to extend its current fields.

:::

## Registering a new field

Registering a field can be made in two different ways:

1. During the load phase of a plugin
2. Using the provided `react-hook` in a component.

### Registering a field during the load of a plugin

Registering a field during the load phase of a plugin can be done as follows:

1. Create a new Field type (in this example a **`media`** field type):

**Path —** `plugins/my-plugin/admin/src/components/InputMedia/index.js`.

```js
import React from 'react';
const InputMedia = props => {
  // Check out the provided props
  console.log(props);

  return <div>InputMedia</div>;
};

export default InputMedia;
```

2. Register the field into the application:

**Path —** `plugins/my-plugin/admin/src/index.js`.

```js
import pluginPkg from '../../package.json';
import InputMedia from './components/InputMedia';
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

  strapi.registerField({ type: 'media', Component: InputMedia });

  return strapi.registerPlugin(plugin);
};
```

By doing so, all the plugins from your project will be able to use the newly registered **Field** type.

### Registering a field inside a React Component

The other way to register a **Field** is to use the provided `react-hook`: **`useStrapi`** it can be done in the `Initializer` Component so it is accessible directly when the user is logged in, if you decide to register your plugin in another component than the `Initializer` the **Field** will only be registered in the administration panel once the component is mounted (the user has navigated to the view where the **Field** is registered).

1. Register the **Field** in the `Initializer` Component:

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
import InputMedia from './components/InputMedia';

const Initializer = ({ updatePlugin }) => {
  const {
    strapi: { fieldApi },
  } = useStrapi();
  const ref = useRef();
  ref.current = updatePlugin;

  useEffect(() => {
    // Register the new field
    strapi.fieldApi.registerField({ type: 'media', Component: InputMedia });

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

## Consuming the Field API

Consuming the **Field** API can only be done by using the provided `react-hook` **`useStrapi`**. Here's an example from the **content-manager** plugin:

**Path —** `~/strapi-plugin-content-manager/admin/src/components/Inputs/index.js`.

```js
import React, { memo, useMemo } from 'react';
// Other imports
// ...
// Import the Inputs component from our component library Buffet.js
import { Inputs as InputsIndex } from '@buffetjs/custom';

// Import the Hook with which you can access the Field API
import { useStrapi } from 'strapi-helper-plugin';

function Inputs({ autoFocus, keys, layout, name, onBlur }) {
  // This is where you will access the field API
  const {
    strapi: { fieldApi },
  } = useStrapi();

  // Other boilerplate code
  // ...

  return (
    <FormattedMessage id={errorId}>
      {error => {
        return (
          <InputsIndex
            {...metadatas}
            autoComplete="new-password"
            autoFocus={autoFocus}
            didCheckErrors={didCheckErrors}
            disabled={disabled}
            error={
              isEmpty(error) || errorId === temporaryErrorIdUntilBuffetjsSupportsFormattedMessage
                ? null
                : error
            }
            inputDescription={description}
            description={description}
            contentTypeUID={layout.uid}
            customInputs={{
              json: InputJSONWithErrors,
              wysiwyg: WysiwygWithErrors,
              uid: InputUID,

              // Retrieve all the fields that other plugins have registered
              ...fieldApi.getFields(),
            }}
            multiple={get(attribute, 'multiple', false)}
            attribute={attribute}
            name={keys}
            onBlur={onBlur}
            onChange={onChange}
            options={enumOptions}
            step={step}
            type={getInputType(type)}
            validations={validations}
            value={inputValue}
            withDefaultValue={false}
          />
        );
      }}
    </FormattedMessage>
  );
}
```

## Field API definition

| Method        | Param         | Description                            |
| :------------ | :------------ | :------------------------------------- |
| getField      | {String} type | Retrieve a Field depending on the type |
| getFields     |               | Retrieve all the Fields                |
| registerField | {Object}      | Register a Field                       |
| removeField   |               | Remove a Field                         |
