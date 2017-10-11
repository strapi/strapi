# Admin panel

One of Strapi's main feature is its fully extendable and customizable admin panel. This section explains how the admin panel section is structured and how to customize it.

See the [Contributing Guide](https://github.com/strapi/strapi/blob/master/.github/CONTRIBUTING.md) for informations on how to develop the Strapi's admin interface.

## Files structure

The entire logic of the admin panel is located in a single folder named `./admin/`. This directory contains the following structure:
```
/admin
└─── admin
|   └─── build // Webpack generated build of the front-end
|   └─── src // Front-end directory
|        └─── app.js // Entry point of the Reacr application
|        └─── assets // Assets directory containing images,...
|        └─── components // Admin's React components directory
|        └─── containers // Admin's high level components directory
|        └─── favicon.ico // Favicon displayed in web browser
|        └─── i18n.js // Internalization logic
|        └─── index.html // Basic html file in which are injected necessary styles and scripts
|        └─── reducers.js // Redux reducers logic
|        └─── store.js // Redux store logic
|        └─── styles // Directory containing the global styles. Specific styles are defined at the component level
|        └─── translations  // Directory containing text messages for each supported languages
└─── config
|    └─── routes.json // Admin's API routes
|    └─── admin.json // Admin's specific settings
└─── controllers // Admin's API controllers
└─── services // Admin's API services
└─── packages.json // Admin's npm dependencies
```

## Customization

Strapi's admin panel can be customized according to your needs, so you can make it reflects your identity: colors, fonts, logo, etc.

### Install admin dependencies

To customize the admin panel, install its own dependencies. To do so, run `npm install` from the `./admin/` folder.

The most interesting dependency is `strapi-helper-plugin` which is a kind of framework, on top of React, used by both plugins and admin panel.

### Development mode

You can start the admin panel in development by running `npm start` from the `./admin/` folder. This command starts Webpack and a web server.

At this point, you should be able to see the admin at http://localhost:4000/admin/.

#### Colors

Admin's styles use [PostCSS](https://github.com/postcss/postcss), and more precisely [PostCSS-SCSS](https://github.com/postcss/postcss-scss).

In this way, colors are stored in variables. The values of these variables can be easily changed in files located in `./admin/admin/src/styles/variables/`.

The changes should be automatically visible.

#### Fonts

Fonts can also be overridden:
 - Add the fonts files you need in `./admin/admin/src/styles/fonts`.
 - Import them from `./admin/admin/src/styles/base/fonts.scss`.
 - Use them by replacing the variables' values in `./admin/admin/src/styles/variables/variables.bootstrap.scss`.

#### Logo

To change the top-right displayed admin panel's logo, replace the image located at `./admin/admin/src/assets/images/logo-strapi.png`.

Note: make sure the size of your image is the same as the existing one (434px x 120px).

#### Rebuild the admin panel

When you are done with your modifications, you need to rebuild the dashboard.
To do that, run the following command from the `./admin` folder:

```
npm run build
```

This will replace the folder's content located at `./admin/admin/build`.

Visit http://localhost:1337/admin/ to make sure your updates have been taken in account.
