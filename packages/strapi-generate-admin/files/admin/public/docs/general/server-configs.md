# Server Configurations

## Apache

This boilerplate includes a `.htaccess` file that does two things:

1. Redirect all traffic to HTTPS because ServiceWorker only works for encrypted
   traffic.
1. Rewrite all pages (e.g. `yourdomain.com/subpage`) to `yourdomain.com/index.html`
   to let `react-router` take care of presenting the correct page.

> Note: For performance reasons you should probably adapt it to run as a static
  `.conf` file (typically under `/etc/apache2/sites-enabled` or similar) so that
  your server doesn't have to apply its rules dynamically per request)

## Nginx

Also it includes a `.nginx.conf` file that does the same on Nginx server.
