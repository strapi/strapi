# Deployment

The administration is nothing more than a React front-end application calling an API. The front-end and the back-end are independent and can be deployed on different servers which brings us to different scenarios:

1. Deploy the entire project on the same server.
2. Deploy the administration panel on another server (AWS S3, Azure, etc) than the API.

Let's dive into the build configurations for each case.

## Deploy the entire project on the same server.

You don't need to touch anything in your configuration file. This is the default behavior and the build configurations will be automatically set. The server will start on the defined port and the administration panel will be accessible through `http://yourdomain.com:1337/dashboard`.

You might want to change the path to access to the administration panel. Here the required configurations to change the path:

**Path —** `./config/server.js`.

```js
module.exports = {
  host: 'localhost',
  port: 1337,
  cron: {
    enabled: false,
  },
  admin: {
    path: '/dashboard', // We change the path to access to the admin (highly recommended for security reasons).
  },
};
```

**You have to rebuild the administration panel to make this work.** [Build instructions](./customization.md#build).

## Deploy the administration panel on another server (AWS S3, Azure, etc) than the API.

It's very common to deploy the front-end and the back-end on different servers. Here are the required configurations to handle this case:

**Path —** `./config/server.js`.

```js
module.exports = {
  host: 'localhost',
  port: 1337,
  cron: {
    enabled: false,
  },
  admin: {
    path: '/', // Note: The administration will be accessible from the root of the domain (ex: http//yourfrontend.com/)
    serveAdminPanel: false, // http://yourbackend.com will not serve any static admin files
    build: {
      backend: 'http://yourbackend.com',
    },
  },
};
```

The administration URL will be `http://yourfrontend.com` and every request from the panel will hit the backend at `http://yourbackend.com`.

## Deploy the administration panel and the plugins on another server than the API

In this case, we suppose that you decided to put your administration panel on a different server than the API.

**Path —** `./config/server.js`.

```js
module.exports = {
  host: 'localhost',
  port: 1337,
  cron: {
    enabled: false,
  },
  admin: {
    path: '/dashboard',
    build: {
      backend: 'http://yourbackend.com',
    },
  },
};
```

The administration URL will be `http://yourfrontend.com/dashboard` and every request from the panel will hit the backend at `http://yourbackend.com`.

The generated `index.html` will look like this:

**Path —** `./build/index.html`.

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
