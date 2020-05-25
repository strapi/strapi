# Caddy Proxying

As Strapi does not handle SSL directly and hosting a Node.js service on the "edge" network is not a secure solution it is recommended that you use some sort of proxy application such as Nginx, Apache, HAProxy, Traefik, or others. Below you will find some sample configurations for Caddy, naturally these configs may not suit all environments and you will likely need to adjust them to fit your needs.

Caddy has some very easy to use options relating to Let's encrypt and automated SSL certificate issuing/renewing, while it is certainly the "newer" web server market, it is quickly becoming a great "non-technical" user application for proxying. **Please do note that Caddy is still very much in development** and as such is evolving often, this guide is based on Caddy v2.0.0.

## Configuration

The below configuration is based on "Caddy File" type, this is a single file config that Caddy will use to run the web server. There are multiple other options such as the Caddy REST API that this guide will not cover, you should review the [Caddy documentation](https://caddyserver.com/docs/) for further information on alternatives. You can also visit the [Caddy Community](https://caddy.community/) to speak with others relating to configuration questions.

### Caddy file

The Caddyfile is a convenient Caddy configuration format for humans. It is most people's favorite way to use Caddy because it is easy to write, easy to understand, and expressive enough for most use cases.

In the below examples you will need to replace your domain, and should you wish to use SSL you will need to tweak these Caddy file configs to suit your needs, SSL is not covered in this guide and you should review the Caddy documentation.

Below are 3 example Caddy configurations:

- Sub-domain based such as `api.example.com`
- Sub-folder based with both the API and Admin on the same sub-folder such as `example.com/api` and `example.com/api/admin`
- Sub-folder based with split API and Admin such as `example.com/api` and `example.com/dashboard`

::::: tabs

:::: tab Sub-Domain

#### Sub-Domain

This config is using the sub-domain that is dedicated to Strapi only. It will bind to port 80 HTTP and proxies all requests (both api and admin) to the Strapi server running locally on the address specified. If you have configured Caddy properly to handle automated SSL you can remove the `http://` and Caddy will automatically convert all HTTP to HTTPS traffic.

---

Example Domain: `api.example.com`

**Path —** `/etc/caddy/Caddyfile`

```
http://api.example.com {
  reverse_proxy 127.0.0.1:1337
}

```

::::

:::: tab Sub-Folder-Unified

#### Sub-Folder Unified

This config is using a sub-folder that is dedicated to Strapi only. It will bind to port 80 HTTP and hosts the "frontend" files on `/var/www` like a normal web server, but proxies all strapi requests on the `example.com/api` sub-path.

::: warning
Please note that this config is not focused on the frontend hosting, you will most likely need to adjust this to your frontend software requirements, it is only being shown here as an example.
:::

---

Example Domain: `example.com/api`

**Path —** `/etc/caddy/Caddyfile`

```
http://api.example.com {
  root * /var/www
  file_server
  route /api* {
    uri strip_prefix /api
    reverse_proxy 127.0.0.1:1337
  }
}
```

::::

:::: tab Sub-Folder-Split

#### Sub-Folder Split

This config is using two sub-folders that are dedicated to Strapi. It will bind to port 80 HTTP and hosts the "frontend" files on `/var/www` like a normal web server, but proxies all strapi API requests on the `example.com/api` sub-path. Likewise it will proxy all admin requests on the `example.com/dashboard` sub-path.

Alternatively for the admin, you can replace the proxy instead with serving the admin `build` folder directly from Caddy, such centralizing the admin but load balancing the backend APIs. The example for this is not shown, but it would likely be something you would build into your CI/CD platform.

::: warning
Please note that this config is not focused on the frontend hosting, you will most likely need to adjust this to your frontend software requirements, it is only being shown here as an example.
:::

---

Example API Domain: `example.com/api`

Example Admin Domain: `example.com/dashboard`

**Path —** `/etc/caddy/Caddyfile`

```
http://api.example.com {
  root * /var/www
  file_server
  route /api* {
    uri strip_prefix /api
    reverse_proxy 127.0.0.1:1337
  }
  route /dashboard* {
    reverse_proxy 127.0.0.1:1337
  }
}
```

::::

:::::

### Strapi Server

In order to take full advantage of a proxied Strapi application you will need to configure Strapi to make it aware of the upstream proxy. Like with the above Caddy configurations there are 3 matching examples. To read more about this server configuration file please see the [server configuration concept](../concepts/configurations.md#server) documentation.

::::: tabs

:::: tab Sub-Domain

#### Sub-Domain Strapi config

---

Example Domain: `api.example.com`

**Path —** `config/server.js`

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: 'https://api.example.com',
});
```

::::

:::: tab Sub-Folder-Unified

#### Sub-Folder Unified Strapi config

---

Example Domain: `example.com/api`

**Path —** `config/server.js`

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: 'https://example.com/api',
});
```

::::

:::: tab Sub-Folder-Split

#### Sub-Folder Split Strapi config

---

Example API Domain: `example.com/api`

Example Admin Domain: `example.com/dashboard`

**Path —** `config/server.js`

```js
module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: 'https://example.com/api',
  admin: {
    url: 'https://example.com/dashboard',
  },
});
```

::::

:::::
