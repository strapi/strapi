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

Virtual host files are what store the configuration for your specific app, service, or proxied service. For usage with Strapi this virtual host file is handling HTTPS connections and proxying them to Strapi running locally on the server. This configuration also redirects all HTTP requests to HTTPs using a 301 redirect

In this example we are using `api.example.com`, you should replace this with your own domain that has DNS configured. Likewise your paths to SSL certificates will need to be changed based on where you place them or, if you are using Let's Encrypt, where your script places them. Please also note that while the path below shows `sites-available` you will need to symlink the file to `sites-enabled` in order for Nginx to enable the config.

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
    # Listen HTTP
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

<!-- ### Strapi Server

Pending https://github.com/strapi/strapi/pull/5724 -->
