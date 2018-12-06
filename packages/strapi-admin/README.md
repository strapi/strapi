# Strapi built-in admin panel

## Description

TODO

## Contribute

### Setup

Create a new Strapi project: `strapi new myApp`.

Go in your project: `cd myApp`.

Remove the generated admin panel: `rm -rf admin`.

Create a symlink in order to be able to easily develop the admin panel from your generated
Strapi application: `ln -s /usr/local/lib/node_modules/strapi-generate-admin admin`
(supposing `/usr/local/lib/node_modules` is your global node modules folder).

### Development

Start the React application: `cd myApp/admin`, then `npm start`.

The admin panel should now be available at [http://localhost:4000](http://localhost:4000).

### Build

In order to check your updates, you can build the admin panel: `cd myApp`, then `npm run build`.
