# Reverse Proxy

When in production, you may want to use Strapi behind a reverse proxy like Nginx. In this guide we will give few **examples** of common use-cases for hosting on an **Ubuntu server**.

## Behind a domain name (mywebsite.com)

- You want to put Strapi on your server with the domain name `mywebsite.com`.
- You want the API to be accessible at: `https://mywebsite.com`
- You want the Admin Panel to be accessible at: `https://mywebsite.com/admin`

You need to edit `server.json`:

**Path —** `./config/environments/**/server.json`.

```json
{
  "host": "localhost",
  "port": 1337,
  "proxy": {
    "enabled": true,
    "ssl": true,
    "host": "mywebsite.com",
    "port": 443
  },
  "cron": {
    "enabled": true
  }
}
```

You need to edit `nginx.conf`:

**Path —** `/etc/nginx/nginx.conf`.

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2; # Dropping SSLv3, ref: POODLE
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

  # Redirect any http call to https
  server {
    listen 80;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443;
    server_name mywebsite.com;

    ssl_certificate           /etc/letsencrypt/live/mywebsite.com/fullchain.pem;
    ssl_certificate_key       /etc/letsencrypt/live/mywebsite.com/privkey.pem;

    ssl on;
    ssl_session_cache  builtin:1000  shared:SSL:10m;
    ssl_protocols  TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
    ssl_prefer_server_ciphers on;

    access_log            /var/log/nginx/mywebiste.access.log;

    # Forward all calls to "https://mywebsite.com/*" to "http://localhost:1337/*"
    location / {
      proxy_set_header        Host $host;
      proxy_http_version      1.1;

      proxy_pass          http://localhost:1337;
      proxy_read_timeout  90;
    }
  }

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

**Note:** Don't forget to generate the certificate (we recommand Let's Encrypt) and adapt the config with your own domain name.

After editing those files, restart Nginx and Strapi and go to `mywebsite.com`. You should now see strapi :)

## Behind a domain name and a path (mywebsite.com/blog)

- You want to put Strapi on your server with the domain name `mywebsite.com`.
- You want the API to be accessible at: `https://mywebsite.com/blog`
- You want the Admin Panel to be accessible at: `https://mywebsite.com/blog/admin`

You need to edit `server.json`:

**Path —** `./config/environments/**/server.json`.

```json
{
  "host": "localhost",
  "port": 1337,
  "proxy": {
    "enabled": true,
    "ssl": true,
    "host": "mywebsite.com",
    "port": 443
  },
  "cron": {
    "enabled": true
  },
  "admin": {
    "build": {
      "publicPath": "/blog/admin",
      "backend": "https://mywebsite.com/blog"
    }
  }
}
```

You need to edit `nginx.conf`:

**Path —** `/etc/nginx/nginx.conf`.

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2; # Dropping SSLv3, ref: POODLE
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

  # Redirect any http call to https
  server {
    listen 80;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443;
    server_name mywebsite.com;

    ssl_certificate           /etc/letsencrypt/live/mywebsite.com/fullchain.pem;
    ssl_certificate_key       /etc/letsencrypt/live/mywebsite.com/privkey.pem;

    ssl on;
    ssl_session_cache  builtin:1000  shared:SSL:10m;
    ssl_protocols  TLSv1 TLSv1.1 TLSv1.2;
    ssl_ciphers HIGH:!aNULL:!eNULL:!EXPORT:!CAMELLIA:!DES:!MD5:!PSK:!RC4;
    ssl_prefer_server_ciphers on;

    access_log            /var/log/nginx/mywebiste.access.log;

    # Catch only URL paths that begin with "/blog"
    location /blog {
      # Remove "/blog" from the beginning of the URL path
      rewrite /blog/(.*)  /$1      break;
      rewrite /blog       /blog/  break;

      proxy_set_header        Host $host;
      proxy_http_version      1.1;

      # Forward all calls to "https://mywebsite.com/*" to "http://localhost:1337/*"
      proxy_pass          http://localhost:1337;
      proxy_read_timeout  90;
    }
  }

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

**Note:** Don't forget to generate the certificate (we recommand Let's Encrypt) and adapt the config with your own domain name.

After editing those files, restart Nginx and Strapi and go to `mywebsite.com/blog`. You should now see strapi :)
