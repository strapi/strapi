# Admin panel

One of Strapi's main feature is its fully extendable and customizable admin panel. This section explains how the admin panel section is structured and how to customize it.

See the [Contributing Guide](https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md) for informations on how to develop the Strapi's admin interface.

## Customization

The administration panel can be customised according to your needs, so you can make it reflects your identity.

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

**_Currently not available_**

### Logo

To change the top-left displayed admin panel's logo, replace the image located at `./.cache/admin/src/assets/images/logo-strapi.png`.

::: note
make sure the size of your image is the same as the existing one (434px x 120px).
:::

---

## Build

To build the administration, run the following command from the root directory of your project.

```
yarn build
```

This will replace the folder's content located at `./build`. Visit http://localhost:1337/admin/ to make sure your updates have been taken in account.

After you have built the admininistration you can now create a new project to develop your API with the changes implemented.

---

## Deployment

The administration is nothing more than a React front-end application calling an API. The front-end and the back-end are independent and can be deployed on different servers which brings us to different scenarios:

1. Deploy the entire project on the same server.
2. Deploy the administration panel on another server (AWS S3, Azure, etc) than the API.

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
      "backend": "http://yourbackend.com"
    }
  }
}
```

The administration URL will be http://yourfrontend.com and every request from the panel will hit the backend at http://yourbackend.com.

#### Deploy the administration panel and the plugins on another server than the API

In this case, we suppose that you decided to put your administration panel on a different server than the API.

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
      "backend": "http://yourbackend.com"
    }
  }
}
```

The administration URL will be http://yourfrontend.com/dashboard and every request from the panel will hit the backend at http://yourbackend.com.

The generated `index.html` will look like this:

**Path —** `./admin/admin/build/index.html`.

```html
<html lang="en">
  <head></head>
  <body>
    <div id="app"></div>
    <script type="text/javascript" src="/dashboard/runtime~main.js"></script>
    <script type="text/javascript" src="/dashboard/main.chunk.js"></script>
  </body>
</html>
```

::: note
The plugins are built into one a single build instead of multiple ones.
:::
