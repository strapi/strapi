# Proxying

As Strapi does not handle SSL directly and hosting a Node.js service on the "edge" network is not a secure solution it is recommended that you use some sort of proxy application such as Nginx, Apache, HAProxy, Traefik, or others. Below you will find some sample configurations for a few of these, naturally these configs may not suit all environments and you will likely need to adjust them to fit your needs.

All of these configurations will proxy to a **subdomain** `IE: api.example.com` which is the only currently supported format, **sub-folder** `IE: example.com/api` based proxying is not currently supported and will likely break access to the admin panel.

## Nginx

The below configuration is based on Nginx virtual hosts, this means that you create configurations for each **domain** to allow serving multiple domains on the same port such as 80 (HTTP) or 443 (HTTPS). It also uses a central upstream file to store an alias to allow for easier management, load balancing, and failover in the case of clustering multiple Strapi deployments.

### Upstream

Upstream blocks are used to map an alias such as `strapi` to a specific URL such as `localhost:1337`. While it would be useful to define these in each virtual host file, Nginx currently doesn't support loading these within the virtual host **if you have multiple virtual host files** and instead you should configure these within the `conf.d` directory as this is loaded before any virtual host files.
