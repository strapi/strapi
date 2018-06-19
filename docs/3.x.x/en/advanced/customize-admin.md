# Admin panel

One of Strapi's main feature is its fully extendable and customizable admin panel. This section explains how the admin panel section is structured and how to customize it.

See the [Contributing Guide](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) for informations on how to develop the Strapi's admin interface.

## Files structure

The entire logic of the admin panel is located in a single folder named `./admin/`. This directory contains the following structure:
```
/admin
└─── admin
|   └─── build // Webpack generated build of the front-end
|   └─── src // Front-end directory
|        └─── app.js // Entry point of the React application
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

***

## Customization

The administration panel can be customised according to your needs, so you can make it reflects your identity: colors, fonts, logo, etc.

### Change access URL

By default, the administration panel is exposed via [http://localhost:1337/admin](http://localhost:1337/admin). However, for security reasons, you can easily update this path.

**Path —** `./config/environment/**/server.json`.
```json
{
  "host": "localhost",
  "port": 1337,
  "autoReload": {
    "enabled": true
  },
  "cron": {
    "enabled": false
  },
  "admin": {
    "path": "/dashboard"
  }
}
```

The panel will be available through [http://localhost:1337/dashboard](http://localhost:1337/dashboard) with the configurations above.

### Development mode

**#1 — Install its own dependencies**

Run `npm install` from the `./admin` folder.

**#2 — Launch the development server**

Run `npm start` from the `./admin` folder. That's all.

**#3 — Go to the browser**

You should be able to see the admin at [http://localhost:4000/admin](http://localhost:4000/admin).

> Note: In development, all the plugins of your app are mounted in the same build as the administration panel.

### Colors

Admin's styles use [PostCSS](https://github.com/postcss/postcss), and more precisely [PostCSS-SCSS](https://github.com/postcss/postcss-scss). In this way, colors are stored in variables. The values of these variables can be easily changed in files located in `./admin/admin/src/styles/variables/`.

The changes should be automatically visible.

### Fonts

Fonts can also be overridden:
 - Add the fonts files you need in `./admin/admin/src/styles/fonts`.
 - Import them from `./admin/admin/src/styles/base/fonts.scss`.
 - Use them by replacing the variables' values in `./admin/admin/src/styles/variables/variables.bootstrap.scss`.

### Logo

To change the top-left displayed admin panel's logo, replace the image located at `./admin/admin/src/assets/images/logo-strapi.png`.

Note: make sure the size of your image is the same as the existing one (434px x 120px).

***

## Build

To build the administration, run the following command from the `./admin` folder:

```
npm run build
```

This will replace the folder's content located at `./admin/admin/build`. Visit http://localhost:1337/admin/ to make sure your updates have been taken in account.

***

## Deployment

The administration is nothing more than a React front-end application calling an API. The front-end and the back-end are independent and can be deployed on different servers which brings us to different scenarios:

1. Deploy the entire project on the same server.
2. Deploy the administration panel on another server (AWS S3, Azure, etc) than the API.
3. Deploy the administration panel and the plugins on another server than the API.

Let's dive into the build configurations for each case.

#### Deploy the entire project on the same server.

You don't need to touch anything in your configuration file. This is the default behaviour and the build configurations will be automatically set. The server will start on the defined port and the administration panel will be accessible through http://yourdomain.com:1337/dashboard.

You might want to change the path to access to the administration panel. Here the required configurations to change the path:

**Path —** `./config/environment/**/server.json`.
```js
{
  "host": "localhost",
  "port": 1337,
  "autoReload": {
    "enabled": false
  },
  "cron": {
    "enabled": false
  },
  "admin": {
    "path": "/dashboard" // We change the path to access to the admin (highly recommended for security reasons).
  }
}
```

**You have to rebuild the administration panel to make this work.** Please follow the [step #2 of the deployment guide](../guides/deployment.md).

#### Deploy the administration panel on another server (AWS S3, Azure, etc) than the API.

It's very common to deploy the front-end and the back-end on different servers. Here the required configurations to handle this case:

**Path —** `./config/environment/**/server.json`.
```js
{
  "host": "localhost",
  "port": 1337,
  "autoReload": {
    "enabled": false
  },
  "cron": {
    "enabled": false
  },
  "admin": {
    "path": "/dashboard",
    "build": {
      "host": "/",  // Note: The administration will be accessible from the root of the domain (ex: http//yourfrontend.com/)
      "backend": "http://yourbackend.com",
      "plugins": {
        "source": "backend" // What does it means? The script tags in the index.html will use the backend value to load the plugins (ex: http://yourbackend.com/dashboard/content-manager/main.js).
      }
    }
  }
}
```

The administration URL will be http://yourfrontend.com and every request from the panel will hit the backend at http://yourbackend.com. The plugins will be injected through the `origin` (means the API itself). In other words, the plugins URLs will be `http://yourbackend.com/dashboard/content-manager/main.js`.

> Note: How it is possible? The API (the Strapi server) owns the plugin and these plugins are exposed through `http://yourbackend.com/admin/**/main.js`


The DOM should look like this:

**Path —** `./admin/admin/build/index.html`.
```html
<html>
  <head></head>
  <body>
    <div id="app"></div>
    <script type="text/javascript" src="/vendor.dll.js"></script>
    <script type="text/javascript" src="/main.js"></script>
    <script src="http://yourbackend.com/dashboard/content-manager/main.js"></script>
    <script src="http://yourbackend.com/dashboard/settings-manager/main.js"></script>
    <script src="http://yourbackend.com/dashboard/content-type-builder/main.js"></script>
  </body>
</html>
```

> Note: The plugins are injected using the `./admin/admin/build/config/plugins.json`. To see the plugins URLs in the `index.html`, you need to launch the administration panel in the browser.

#### Deploy the administration panel and the plugins on another server than the API

In this case, we suppose that you decided to put your administration and the plugins on the same server but on a different server as the API.

**Path —** `./config/environment/**/server.json`.
```js
{
  "host": "localhost",
  "port": 1337,
  "autoReload": {
    "enabled": false
  },
  "cron": {
    "enabled": false
  },
  "admin": {
    "build": {
      "host": "http://yourfrontend.com/dashboard", // Note: The custom path has moved directly in the host URL.
      "backend": "http://yourbackend.com",
      "plugins": {
        "source":  "host", // What does it means? The script tags in the index.html will use the host value to load the plugins (ex: http://yourfrontend.com/dashboard/plugins/content-manager/main.js).
        "folder": "/plugins"
      }
    }
  }
}
```

The administration URL will be http://yourfrontend.com/dashboard and every request from the panel will hit the backend at http://yourbackend.com. The plugins will be injected through the `host`. It means that the plugins URLs will use the host URL as the origin. So the plugins URLs will be `http://yourfrontend.com/dashboard/plugins/content-manager/main.js`.

We also added a `folder` setting to separate the plugins from the administration build. In your server, the files structure should look like this:
```
- src/
  - 0bd35bad03d09ca61ac6cce225112e36.svg
  - 1d51d8767683a24635702f720cda4e26.svg
  - af3aefd0529349e40e4817c87c620836.png
  - config/
    - plugins.json
  - main.js
  - main.js.map
  - plugins/
    - content-type-builder/
      - 0bd35bad03d09ca61ac6cce225112e36.svg
      - 1d51d8767683a24635702f720cda4e26.svg
      - af3aefd0529349e40e4817c87c620836.png
      - main.js
      - main.js.map
    - content-manager/
      - ...
      - main.js
      - main.js.map
    - settings-manager/
      - ...
      - main.js
      - main.js.map
  - vendor.dll.js
  - vendor.dll.js.map
```

The generated `index.html` will look like this:

**Path —** `./admin/admin/build/index.html`.
```html
<html>
  <head></head>
  <body>
    <div id="app"></div>
    <script type="text/javascript" src="/dashboard/vendor.dll.js"></script>
    <script type="text/javascript" src="/dashboard/main.js"></script>
    <script src="/dashboard/plugins/content-manager/main.js"></script>
    <script src="/dashboard/plugins/settings-manager/main.js"></script>
    <script src="/dashboard/plugins/content-type-builder/main.js"></script>
  </body>
</html>
```

> Note: The plugins are injected using the `./admin/admin/build/config/plugins.json`. To see the plugins URLs in the `index.html`, you need to launch the administration panel in the browser.
