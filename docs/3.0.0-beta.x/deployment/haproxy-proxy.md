# HAProxy Proxying

As Strapi does not handle SSL directly and hosting a Node.js service on the "edge" network is not a secure solution it is recommended that you use some sort of proxy application such as Nginx, Apache, HAProxy, Traefik, or others. Below you will find some sample configurations for HAProxy, naturally these configs may not suit all environments and you will likely need to adjust them to fit your needs.

## Configuration

### HAProxy

Below are 3 example HAProxy configurations:

- Sub-domain based such as `api.example.com`
- Sub-folder based with both the API and Admin on the same sub-folder such as `example.com/api` and `example.com/api/admin`
- Sub-folder based with split API and Admin such as `example.com/api` and `example.com/dashboard`

::::: tabs

:::: tab Sub-Domain

#### Sub-Domain

---

Example Domain: `api.example.com`

Path: ``

```

```

::::

:::: tab Sub-Folder-Unified

#### Sub-Folder Unified

::: warning
Please note that this config is not focused on the frontend hosting, you will most likely need to adjust this to your frontend software requirements, it is only being shown here as an example.
:::

---

Example Domain: `example.com/api`

Path: ``

```

```

::::

:::: tab Sub-Folder-Split

#### Sub-Folder Split

::: warning
Please note that this config is not focused on the frontend hosting, you will most likely need to adjust this to your frontend software requirements, it is only being shown here as an example.
:::

---

Example API Domain: `example.com/api`

Example Admin Domain: `example.com/dashboard`

Path: ``

```

```

::::

:::::

### Strapi Server

In order to take full advantage of a proxied Strapi application you will need to configure Strapi to make it aware of the upstream proxy. Like with the above HAProxy configurations there are 3 matching examples. To read more about this server configuration file please see the [server configuration concept](../concepts/configurations.md#server) documentation.

::::: tabs

:::: tab Sub-Domain

#### Sub-Domain Strapi config

---

Example Domain: `api.example.com`

Path: `config/server.js`

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

Path: `config/server.js`

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

Path: `config/server.js`

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
