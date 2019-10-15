# Customization

The administration panel can be customized according to your needs, so you can make it reflects your identity.

::: warning
To apply your changes you need to [rebuild](#build) your admin panel
:::

## Change access URL

By default, the administration panel is exposed via [http://localhost:1337/admin](http://localhost:1337/admin). However, for security reasons, you can easily update this path.

**Path —** `./config/environment/**/server.json`.

```json
{
  "host": "localhost",
  "port": 1337,
  "cron": {
    "enabled": false
  },
  "admin": {
    "path": "/dashboard"
  }
}
```

The panel will be available through [http://localhost:1337/dashboard](http://localhost:1337/dashboard) with the configurations above.

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

**Path --** `my-app/admin/src/translations/index.js`

```js
import en from './en.json';
import fr from './fr.json';

const trads = {
  en,
  fr,
};

export default trads;
```

**Path --** `my-app/admin/src/i18n.js`

```js
import { addLocaleData } from 'react-intl';
import { reduce } from 'lodash';
import en from 'react-intl/locale-data/en';
import fr from 'react-intl/locale-data/fr';
import trads from './translations';

// We dismiss pt-BR and zh-Hans locales since they are not supported by react-intl
const locales = {
  en,
  fr,
};
const languages = Object.keys(trads);

/**
 * Dynamically generate `translationsMessages object`.
 */
const translationMessages = reduce(
  languages,
  (result, language) => {
    const obj = result;
    obj[language] = trads[language];

    if (locales[language]) {
      addLocaleData(locales[language]);
    }

    return obj;
  },
  {}
);

export { languages, translationMessages };
```

::: note
With this modification only English and French will be available in your admin
:::

### Customize a plugin

Similarly to the back-end override system any file added in `my-app/extensions/<plugin-name>/admin/` will be copied and used instead of the original one (use with care).

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

**Path --** `my-app/extensions/content-manager/admin/src/components/WysiwygWithErrors/index.js`

```js
import React from 'react';
import MyNewWYSIWYG from 'my-awesome-lib';

// This is a dummy example
const WysiwygWithErrors = props => <MyNewWYSIWYG {...props} />;

export default WysiwygWithErrors;
```

### Styles

The AdminUI package source can be easily found in `./node_modules/strapi-admin/src/`.

For example, to change the top-left displayed admin panel's color, `./node_modules/strapi-admin/admin/src/components/LeftMenuHeader/styles.scss` should be overriden by `./admin/src/components/LeftMenuHeader/styles.scss` with your own styles.

Thus, you are replacing the files that would normally be in `node_modules/strapi-admin/admin/src` and directing them to `admin/src/some/file/path`.

To apply your changes you need to rebuild your admin panel

```
npm run build
```

### Logo

To change the top-left displayed admin panel's logo, add your custom image at `./admin/src/assets/images/logo-strapi.png`.

::: note
make sure the size of your image is the same as the existing one (434px x 120px).
:::

### Tutorial videos

To disable the information box containing the tutorial videos, create a file at `./admin/src/config.js`

Add the following configuration:

```js
export const SHOW_TUTORIALS = false;
```

## Build

To build the administration, run the following command from the root directory of your project.

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "yarn" id="yarn-build-dev"

```
yarn build
```

:::

::: tab "npm" id="npm-build-dev"

```
npm run build
```

:::

::: tab "strapi" id="strapi-build-dev"

```
strapi build
```

:::

::::

you can build your admin panel with a specific configuration (located in the `./config/environments/**/server.json`) config by specifying a NODE_ENV as follows:

:::: tabs cache-lifetime="10" :options="{ useUrlFragment: false }"

::: tab "yarn" id="yarn-build-prod"

```
NODE_ENV=production yarn build
```

:::

::: tab "npm" id="npm-build-prod"

```
NODE_ENV=production npm run build
```

:::

::: tab "strapi" id="strapi-build-prod"

```
NODE_ENV=production strapi build
```

:::

::::

This will replace the folder's content located at `./build`. Visit [http://localhost:1337/admin](http://localhost:1337/admin) to make sure your updates have been taken into account.
