# Deployment

The administration is nothing more than a React front-end application calling an API. The front-end and the back-end are independent and can be deployed on different servers which brings us to different scenarios:

1. Deploy the entire project on the same server.
2. Deploy the administration panel on another server (AWS S3, Azure, etc) than the API.

Let's dive into the build configurations for each case.

## Deploy the entire project on the same server.

You don't need to touch anything in your configuration file. This is the default behavior and the build configuration will be automatically set. The server will start on the defined port and the administration panel will be accessible through `http://yourdomain.com:1337/dashboard`.

You might want to change the path to access the administration panel. Here is the required configuration to change the path:

**Path —** `./config/server.js`.

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    url: '/dashboard', // We change the path to access to the admin (highly recommended for security reasons).
  },
});
```

**You have to rebuild the administration panel to make this work.** [Build instructions](./customization.md#build).

## Deploy the administration panel on another server (AWS S3, Azure, etc) than the API.

It's very common to deploy the front-end and the back-end on different servers. Here is the required configuration to handle this case:

**Path —** `./config/server.js`.

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: 'http://yourbackend.com',
  admin: {
    url: '/', // Note: The administration will be accessible from the root of the domain (ex: http://yourfrontend.com/)
    serveAdminPanel: false, // http://yourbackend.com will not serve any static admin files
  },
});
```

After running `yarn build` with this configuration, the folder `build` will be created/overwritten. You can then use this folder to serve it from another server with the domain of your choice (ex: `http://youfrontend.com`).

The administration URL will then be `http://yourfrontend.com` and every request from the panel will hit the backend at `http://yourbackend.com`.

::: tip NOTE
If you add a path to the `url` option, it won't prefix your app. To do so, you need to also use a proxy server like Nginx. More [here](../getting-started/deployment.md#optional-software-guides).
:::
