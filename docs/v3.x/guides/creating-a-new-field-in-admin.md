# Creating a new Field in the administration panel

In this guide we will see how you can create a new Field for your administration panel.

## Introduction

For this example, we will see how to create a color picker with [react-color](https://casesandberg.github.io/react-color/) in the **`Content Manager`** plugin and register it as a new field in the **`Content-Type Builder`** plugin by creating a new plugin which will add a new **Field** in your application.

## Setup

1. Create a new project:

```bash
# Create an application using SQLite and prevent the server from starting automatically as we will create a plugin
# right after the project generation
yarn create strapi-app my-app --quickstart --no-run
```

2. Generate a plugin:

```bash
yarn run strapi generate:plugin custom-fields
```

3. Install the needed dependencies:

```bash
cd my-app/plugins/custom-fields
yarn add react-color
```

4. Start your application with the front-end development mode:

```bash
cd my-app
yarn develop --watch-admin
```

Once this step is over all we need to do is to create our new Color Picker that will be shown in the **Content Manager** plugin.

### Creating the Color Picker

In this part we will create the color picker component:

**Path —** `./plugins/custom-fields/admin/src/components/ColorPicker/index.js`

```js
import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { Label, InputDescription, InputErrors } from 'strapi-helper-plugin';
import { SketchPicker } from 'react-color';

const ColorPicker = ({
  inputDescription,
  errors,
  label,
  name,
  noErrorsDescription,
  onChange,
  value,
}) => {
  let spacer = !isEmpty(inputDescription) ? <div style={{ height: '.4rem' }} /> : <div />;

  if (!noErrorsDescription && !isEmpty(errors)) {
    spacer = <div />;
  }
  const handleChange = ({ hex }) => {
    // Please pay attention to this object shape as this is what will be sent to our DataManager!
    onChange({ target: { name, value: hex } });
  };

  return (
    <div
      style={{
        marginBottom: '1.6rem',
        fontSize: '1.3rem',
        fontFamily: 'Lato',
      }}
    >
      <Label htmlFor={name} message={label} style={{ marginBottom: 10 }} />
      <SketchPicker onChangeComplete={handleChange} color={value || '#fff'} />
      <InputDescription
        message={inputDescription}
        style={!isEmpty(inputDescription) ? { marginTop: '1.4rem' } : {}}
      />
      <InputErrors errors={(!noErrorsDescription && errors) || []} name={name} />
      {spacer}
    </div>
  );
};

ColorPicker.defaultProps = {
  errors: [],
  inputDescription: null,
  label: '',
  noErrorsDescription: false,
  value: '#fff',
};

ColorPicker.propTypes = {
  errors: PropTypes.array,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default ColorPicker;
```

At this point we have simply created a new plugin which is mounted in our project but our custom **Field** has not been registered yet.

### Creating a new Field

Since the goal of our plugin is to create a new **Field**, we need to register it just like in [this guide](./registering-a-field-in-admin) but with additional properties. In order to do so, we will simply modify the front-end entry point of our plugin:

**Path —** `./plugins/custom-fields/admin/src/index.js`

```js
import pluginPkg from '../../package.json';
import ColorPicker from './components/ColorPicker';
// Optional: add a nice Palette icon to our color picker
import { faPalette } from '@fortawesome/free-solid-svg-icons';
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
    isRequired: pluginPkg.strapi.required || false,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: null,
    name: pluginPkg.strapi.name,
    preventComponentRendering: false,
    settings: null,
    trads: {},
  };

  strapi.registerField({
    type: 'colorpicker',
    Component: ColorPicker,
    collectionType: 'text', // mandatory when creating a new field, only 'text' is working for now
    pluginId, // mandatory, used for translation keys
    icon: faPalette, // optional, must be a valid icon exported by @fortawesome to work
  });

  return strapi.registerPlugin(plugin);
};
```

### Adding translation keys

Since this is a new **Field** for the **`Content-Type Builder`**, we need to add some translations keys to our plugin:

**Path -** `plugins/custom-fields/admin/src/translations/fr.json`

```json
{
  "attribute.colorpicker": "Couleur",
  "attribute.colorpicker.description": "Palette de couleurs"
}
```

And VOILA, if you create a new `collectionType`, a `singleType` or a component with a `colorpicker` field you will see the implementation of the [React Sketch Color Picker](https://casesandberg.github.io/react-color/#usage-include) in the **`Content Manager`**.
