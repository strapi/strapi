# HAProxy Proxying

As Strapi does not handle SSL directly and hosting a Node.js service on the "edge" network is not a secure solution it is recommended that you use some sort of proxy application such as Nginx, Apache, HAProxy, Traefik, or others. Below you will find some sample configurations for HAProxy, naturally these configs may not suit all environments and you will likely need to adjust them to fit your needs.

## Configuration

The below examples are more or less acting as an "SSL termination" proxy, meaning that HAProxy is only accepting the requests on SSL and proxying to other backend services such as Strapi or other web servers. **HAProxy cannot serve static content** and as such it is usually used to handle multi-server deployments in a failover or load-balance situation. The examples provided below are based around everything existing on the same server, but could easily be tweaked for multi-server deployments.

### HAProxy

As mentioned previously the following examples are either proxying all requests directly to Strapi or are splitting requests between Strapi and some other backend web server such as Nginx, Apache, or others.

Below are 3 example HAProxy configurations:

- Sub-domain based such as `api.example.com`
- Sub-folder based with both the API and Admin on the same sub-folder such as `example.com/api` and `example.com/api/admin`
- Sub-folder based with split API and Admin such as `example.com/api` and `example.com/dashboard`

::::: tabs

:::: tab Sub-Domain

#### Sub-Domain

This config is using the sub-domain that is dedicated to Strapi only. It will redirect normal HTTP traffic over to SSL and proxies all requests (both api and admin) to the Strapi server running on the server.

---

Example Domain: `api.example.com`

**Path —** `/etc/haproxy/haproxy.cfg`

```
global
        log /dev/log    local0
        log /dev/log    local1 notice
        chroot /var/lib/haproxy
        stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
        stats timeout 30s
        user haproxy
        group haproxy
        daemon

        # Default SSL material locations
        ca-base /etc/ssl/certs
        crt-base /etc/ssl/private

        # See: https://ssl-config.mozilla.org/#server=haproxy&server-version=2.0.3&config=intermediate
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA3$
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
        log     global
        mode    http
        option  httplog
        option  dontlognull
        timeout connect 5000
        timeout client  50000
        timeout server  50000
        errorfile 400 /etc/haproxy/errors/400.http
        errorfile 403 /etc/haproxy/errors/403.http
        errorfile 408 /etc/haproxy/errors/408.http
        errorfile 500 /etc/haproxy/errors/500.http
        errorfile 502 /etc/haproxy/errors/502.http
        errorfile 503 /etc/haproxy/errors/503.http
        errorfile 504 /etc/haproxy/errors/504.http

# Everything above this line is HAProxy defaults

frontend api.example.com
        bind *:80
        bind *:443 ssl crt /path/to/your/cert
        http-request redirect scheme https unless { ssl_fc }
        default_backend strapi-backend

backend strapi-backend
        server local 127.0.0.1:1337
```

::::

:::: tab Sub-Folder-Unified

#### Sub-Folder Unified

This config is using a sub-folder that is dedicated to Strapi only. It will redirect normal HTTP traffic over to SSL and proxies the "frontend" to `localhost:8080`, but proxies all Strapi requests on the `example.com/api` sub-path to the locally running Strapi application.

::: warning
HAProxy **cannot** serve static content, the below example is proxying frontend traffic to some other web server running on the localhost port 8080
:::

---

Example Domain: `example.com/api`

**Path —** `/etc/haproxy/haproxy.cfg`

```
global
        log /dev/log    local0
        log /dev/log    local1 notice
        chroot /var/lib/haproxy
        stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
        stats timeout 30s
        user haproxy
        group haproxy
        daemon

        # Default SSL material locations
        ca-base /etc/ssl/certs
        crt-base /etc/ssl/private

        # See: https://ssl-config.mozilla.org/#server=haproxy&server-version=2.0.3&config=intermediate
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA3$
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
        log     global
        mode    http
        option  httplog
        option  dontlognull
        timeout connect 5000
        timeout client  50000
        timeout server  50000
        errorfile 400 /etc/haproxy/errors/400.http
        errorfile 403 /etc/haproxy/errors/403.http
        errorfile 408 /etc/haproxy/errors/408.http
        errorfile 500 /etc/haproxy/errors/500.http
        errorfile 502 /etc/haproxy/errors/502.http
        errorfile 503 /etc/haproxy/errors/503.http
        errorfile 504 /etc/haproxy/errors/504.http

# Everything above this line is HAProxy defaults

frontend example.com
        bind *:80
        bind *:443 ssl crt /path/to/your/cert
        http-request redirect scheme https unless { ssl_fc }
        acl api path_beg /api
        use_backend strapi-backend if api
        default_backend default-backend

backend default-backend
        # HAProxy -cannot- serve static content on it's own
        # This example is relaying traffic to some other backend webserver
        server somewebserver 127.0.0.1:8080

backend strapi-backend
        http-request set-path "%[path,regsub(^/api/,/)]"
        server local 127.0.0.1:1337

```

::::

:::: tab Sub-Folder-Split

#### Sub-Folder Split

This config is using a sub-folder that is dedicated to Strapi only. It will redirect normal HTTP traffic over to SSL and proxies the "frontend" to `localhost:8080`, but proxies all strapi api requests on the `example.com/api` sub-path to the locally running Strapi application. Likewise it will proxy all admin requests on the `example.com/dashboard` sub-path.

::: warning
Please note that this config is not focused on the frontend hosting, you will most likely need to adjust this to your frontend software requirements, it is only being shown here as an example.
:::

---

Example API Domain: `example.com/api`

Example Admin Domain: `example.com/dashboard`

**Path —** `/etc/haproxy/haproxy.cfg`

```
global
        log /dev/log    local0
        log /dev/log    local1 notice
        chroot /var/lib/haproxy
        stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
        stats timeout 30s
        user haproxy
        group haproxy
        daemon

        # Default SSL material locations
        ca-base /etc/ssl/certs
        crt-base /etc/ssl/private

        # See: https://ssl-config.mozilla.org/#server=haproxy&server-version=2.0.3&config=intermediate
        ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA3$
        ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
        ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
        log     global
        mode    http
        option  httplog
        option  dontlognull
        timeout connect 5000
        timeout client  50000
        timeout server  50000
        errorfile 400 /etc/haproxy/errors/400.http
        errorfile 403 /etc/haproxy/errors/403.http
        errorfile 408 /etc/haproxy/errors/408.http
        errorfile 500 /etc/haproxy/errors/500.http
        errorfile 502 /etc/haproxy/errors/502.http
        errorfile 503 /etc/haproxy/errors/503.http
        errorfile 504 /etc/haproxy/errors/504.http

# Everything above this line is HAProxy defaults

frontend example.com
        bind *:80
        bind *:443 ssl crt /path/to/your/cert
        http-request redirect scheme https unless { ssl_fc }
        acl api path_beg /api
        acl dashboard path_beg /dashboard
        use_backend strapi-api-backend if api
        use_backend strapi-dashboard-backend if dashboard
        default_backend default-backend

backend default-backend
        # HAProxy -cannot- serve static content on it's own
        # This example is relaying traffic to some other backend webserver
        server somewebserver 127.0.0.1:8080

backend strapi-api-backend
        http-request set-path "%[path,regsub(^/api/,/)]"
        server local 127.0.0.1:1337

backend strapi-dashboard-backend
        server local 127.0.0.1:1337
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
