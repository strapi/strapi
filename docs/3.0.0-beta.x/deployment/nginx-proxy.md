# Nginx Proxying

As Strapi does not handle SSL directly and hosting a Node.js service on the "edge" network is not a secure solution it is recommended that you use some sort of proxy application such as Nginx, Apache, HAProxy, Traefik, or others. Below you will find some sample configurations for Nginx, naturally these configs may not suit all environments and you will likely need to adjust them to fit your needs.

## Configuration

The below configuration is based on Nginx virtual hosts, this means that you create configurations for each **domain** to allow serving multiple domains on the same port such as 80 (HTTP) or 443 (HTTPS). It also uses a central upstream file to store an alias to allow for easier management, load balancing, and failover in the case of clustering multiple Strapi deployments.

### Nginx Upstream

Upstream blocks are used to map an alias such as `strapi` to a specific URL such as `localhost:1337`. While it would be useful to define these in each virtual host file, Nginx currently doesn't support loading these within the virtual host **if you have multiple virtual host files** and instead you should configure these within the `conf.d` directory as this is loaded before any virtual host files.

In the below configuration we are mapping `localhost:1337` to the Nginx alias `strapi`.

Path: `/etc/nginx/conf.d/upstream.conf`

```
# Strapi server
upstream strapi {
    server 127.0.0.1:1337;
}
```

### Nginx Virtual Host

Virtual host files are what store the configuration for your specific app, service, or proxied service. For usage with Strapi this virtual host file is handling HTTPS connections and proxying them to Strapi running locally on the server. This configuration also redirects all HTTP requests to HTTPs using a 301 redirect.

In the below examples you will need to replace your domain and likewise your paths to SSL certificates will need to be changed based on where you place them or, if you are using Let's Encrypt, where your script places them. Please also note that while the path below shows `sites-available` you will need to symlink the file to `sites-enabled` in order for Nginx to enable the config.

Below are 3 example Nginx configurations:

- Sub-domain based such as `api.example.com`
- Sub-folder based with both the API and Admin on the same sub-folder such as `example.com/api` and `example.com/api/admin`
- Sub-folder based with split API and Admin such as `example.com/api` and `example.com/dashboard`

::::: tabs

:::: tab Sub-Domain

#### Sub-Domain

This config is using the sub-domain that is dedicated to Strapi only. It will redirect normal HTTP traffic over to SSL and proxies all requests (both api and admin) to the Strapi server running on the upstream alias configured above.

---

Example Domain: `api.example.com`

Path: `/etc/nginx/sites-available/strapi.conf`

```
server {
    # Listen HTTP
    listen 80;
    server_name api.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    # Listen HTTPS
    listen 443 ssl;
    server_name api.example.com;

    # SSL config
    ssl_certificate /path/to/your/certificate/file;
    ssl_certificate_key /path/to/your/certificate/key;

    # Proxy Config
    location / {
        proxy_pass http://strapi;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }
}
```

::::

:::: tab Sub-Folder-Unified

#### Sub-Folder Unified

This config is using a sub-folder that is dedicated to Strapi only. It will redirect normal HTTP traffic over to SSL and hosts the "frontend" files on `/var/www/html` like a normal web server, but proxies all strapi requests on the `example.com/api` sub-path.

::: warning
Please note that this config is not focused on the frontend hosting, you will most likely need to adjust this to your frontend software requirements, it is only being shown here as an example.
:::

---

Example Domain: `example.com/api`

Path: `/etc/nginx/sites-available/strapi.conf`

```
server {
    # Listen HTTP
    listen 80;
    server_name example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    # Listen HTTPS
    listen 443 ssl;
    server_name example.com;

    # SSL config
    ssl_certificate /path/to/your/certificate/file;
    ssl_certificate_key /path/to/your/certificate/key;

    # Static Root
    location / {
        root /var/www/html;
    }

    # Strapi API and Admin
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://strapi;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }
}
```

::::

:::: tab Sub-Folder-Split

#### Sub-Folder Split

This config is using two sub-folders that are dedicated to Strapi. It will redirect normal HTTP traffic over to SSL and hosts the "frontend" files on `/var/www/html` like a normal web server, but proxies all strapi API requests on the `example.com/api` sub-path. Likewise it will proxy all admin requests on the `example.com/dashboard` sub-path.

Alternatively for the admin, you can replace the proxy instead with serving the admin `build` folder directly from Nginx, such centralizing the admin but load balancing the backend APIs. The example for this is not shown, but it would likely be something you would build into your CI/CD platform.

::: warning
Please note that this config is not focused on the frontend hosting, you will most likely need to adjust this to your frontend software requirements, it is only being shown here as an example.
:::

---

Example API Domain: `example.com/api`

Example Admin Domain: `example.com/dashboard`

Path: `/etc/nginx/sites-available/strapi.conf`

```
server {
    # Listen HTTP
    listen 80;
    server_name example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    # Listen HTTPS
    listen 443 ssl;
    server_name example.com;

    # SSL config
    ssl_certificate /path/to/your/certificate/file;
    ssl_certificate_key /path/to/your/certificate/key;

    # Static Root
    location / {
        root /var/www/html;
    }

    # Strapi API
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://strapi;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }

    # Strapi Dashboard
    location /dashboard {
        proxy_pass http://strapi/dashboard;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }
}
```

::::

:::::

### Strapi Server

In order to take full advantage of a proxied Strapi application you will need to configure Strapi to make it aware of the upstream proxy. Like with the above Nginx configurations there are 3 matching examples. To read more about this server configuration file please see the [server configuration concept](../concepts/configurations.md#server) documentation.

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
