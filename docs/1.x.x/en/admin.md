# Admin

> Where is my data ?

This is a recurring question when you create web applications from scratch or
using a web framework. That's why Strapi provides a ready-to-use admin panel.

## Dashboard

This part is a summary of your application.

*Work in progress.*

## Data Explorer

The Data Explorer allows you to easily manage your data.
The UI is auto-generated depending on the `models` of your application.
So, in just a few seconds, you are able to create, search, view, edit and
delete your data.

To try it, simply create a new API using the Studio or the CLI.
Then restart the server and reload the web browser page.

![Strapi Admin panel Screenshot Data Explorer](http://strapi.io/assets/screenshots/create.png "Strapi Admin panel Screenshot Data Explorer")

## Users

### List of Users

List, edit and delete the users information of your application.

### Roles

Each user can be related to one or many roles.

The first registered user is automatically related to the `admin` role.

### Permissions

Strapi contains a security system based on the routes of your application.
The admin panel allows you to visualize the different routes of your server and
to manage the security of each of them.

- `Public`: no level of security (anyone can use the route).
- `Registered`: the user has to be logged to use the route.
- `Owner`: the user must be one of the `contributors` of the `model` updated or deleted.
- `Admin`: only the users related to the `admin` role are allowed to access the route.

![Strapi Admin panel Screenshot Permissions](http://strapi.io/assets/screenshots/permissions.png "Strapi Admin panel Screenshot Permissions")

## Customization

The admin panel is developed with Angular.js, using the John PAPA styleguide.
You can customize the admin from `./api/admin/public` in your generated application.

To build the admin panel:
- You need to install `bower` and `gulp` with `$ npm install gulp bower -g`.
- Run `$ npm install` in this directory.
- Run `$ gulp serve`.
- Visit [http://localhost:3002](http://localhost:3002) from your web browser.
- When you are ready to use your customized admin panel, run `$ gulp dist`.
  That will update the files in the following folder: `./api/admin/public/dist`.
- Visit [http://localhost:1337/admin/](http://localhost:1337/admin/).

If you change the default port (1337) of your server, you will have to update
`./api/admin/public/config/config.json` and then run `$ npm install && gulp dist`
in `./api/admin/public`.

**NOTE:** You can create your own `admin` generator using the `.strapirc` file.
[Learn more how to use custom generators.](http://strapi.io/documentation/customization)
