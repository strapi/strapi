# Customization

The administration panel can be customized according to your needs, so you can make it reflect your identity.

::: warning
To apply your changes you need to [rebuild](#build) your admin panel
:::

## Change access URL

By default, the administration panel is exposed via [http://localhost:1337/admin](http://localhost:1337/admin). However, for security reasons, you can easily update this path. For more advanced settings please see the [server config](../concepts/configurations.md#server) documentation.

**Path —** `./config/server.js`.

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    url: '/dashboard',
  },
});
```

The panel will be available through [http://localhost:1337/dashboard](http://localhost:1337/dashboard) with the configuration above.

## Development mode

To enable the front-end development mode you need to start your application using the `--watch-admin` flag.

```bash
cd my-app
strapi develop --watch-admin
```

With this option you can do the following:

### Customize the `strapi-admin` package

All files added in `my-app/admin/src/` will either be replaced or added

**Example: Changing the available locales of your application**

```bash
# Create both the admin and admin/src/translations folders
cd my-app && mkdir -p admin/src/translations
# Change the available locales of the administration panel
touch admin/src/i18n.js
# Change the import and exports of the translations files
touch admin/src/translations/index.js
```

**Path -** `my-app/admin/src/translations/index.js`

```js
import en from './en.json';
import fr from './fr.json';

const trads = {
  en,
  fr,
};

export default trads;
```

::: tip
With this modification only English and French will be available in your admin
:::

### Customize a plugin

Similarly to the back-end override system, any file added in `my-app/extensions/<plugin-name>/admin/` will be copied and used instead of the original one (use with care).

**Example: Changing the current WYSIWYG**

```bash
cd my-app/extensions
# Create the content manager folder
mkdir content-manager && cd content-manager
# Create the admin folder
mkdir -p admin/src
# Create the components folder and the WysiwygWithErrors one
cd admin/src && mkdir -p components/WysiwygWithErrors
# Create the index.js so the original file is overridden
touch components/WysiwygWithErrors/index.js
```

**Path -** `my-app/extensions/content-manager/admin/src/components/WysiwygWithErrors/index.js`

```js
import React from 'react';
import MyNewWYSIWYG from 'my-awesome-lib';

// This is a dummy example
const WysiwygWithErrors = props => <MyNewWYSIWYG {...props} />;

export default WysiwygWithErrors;
```

### Styles

The AdminUI package source can be easily found in `./node_modules/strapi-admin/src/`.

For example, to change the top-left displayed admin panel's color, copy the `./node_modules/strapi-admin/admin/src/components/LeftMenuHeader` folder to `./admin/src/components/LeftMenuHeader` and change the styles inside `./admin/src/components/LeftMenuHeader/Wrapper.js`.

Thus, you are replacing the files that would normally be in `node_modules/strapi-admin/admin/src` and directing them to `admin/src/some/file/path`.

To apply your changes you need to rebuild your admin panel

```
npm run build
```

### Logo

To change the top-left displayed admin panel's logo, add your custom image at `./admin/src/assets/images/logo-strapi.png`.

::: tip
make sure the size of your image is the same as the existing one (434px x 120px).
:::

### Tutorial videos

To disable the information box containing the tutorial videos, create a file at `./admin/src/config.js`

Add the following configuration:

```js
export const LOGIN_LOGO = null;
export const SHOW_TUTORIALS = false;
export const SETTINGS_BASE_URL = '/settings';
```

### Changing the host and port

By default, the front-development server runs on `localhost:8000`. However, you can change this setting by updating the following configuration:

**Path —** `./config/server.js`.

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    host: 'my-host', // only used along with `strapi develop --watch-admin` command
    port: 3000, // only used along with `strapi develop --watch-admin` command
  },
});
```

## Build

To build the administration, run the following command from the root directory of your project.

:::: tabs

::: tab yarn

```
yarn build
```

:::

::: tab npm

```
npm run build
```

:::

::: tab strapi

```
strapi build
```

:::

::::

This will replace the folder's content located at `./build`. Visit [http://localhost:1337/admin](http://localhost:1337/admin) to make sure your updates have been taken into account.
