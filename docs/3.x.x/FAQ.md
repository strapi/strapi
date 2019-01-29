# FAQ

Below is a list of "common questions" asked in both [Github issues](https://github.com/strapi/strapi/issues) or on the [Strapi slack](https://slack.strapi.io).

## Windows support for development mode

Currently Windows has known issues, right now it is recommended that you either use WSL (Windows Subsystem Linux) or setup a Linux virtual machine. Better support will come eventually but right now it is not a priority for core Strapi development.

## Yarn support

Yarn is currently not supported. Support for yarn will come eventually but is not a priority.
Please use npm.

## SSL Support

Typically it is much easier when working with Nodejs projects to offload SSL and encryption to external services such as Nginx or Apache. Below is a basic guide on getting started with Nginx, Let's Encrypt, Vultr, and MySQL to get Strapi up and running in a production level environment:

[DMehaffy's Guide to Strapi in Production](https://medium.com/@derrickmehaffy/using-strapi-in-production-with-https-717af82d1445)

## Request headers

Strapi is consumer/front-end agnostic and thus provides no means of submitting a form directly via `application/x-www-form-urlencoded` or `multipart/form-data` (which is the content-type when submitting forms). You will need to send your requests via Ajax as `application/json`.

## Model & Field naming

Right now the Strapi backend does not handle different case options or symbols very well, this is being worked on however in the short term you will need to use all lowercase naming schemes. Many of us know this is ugly and makes the frontend look "incomplete" or "unprofessional", however until the backend support it, this is a requirement.

The follow list has some examples of unsupported case styles (not limited to):

* camelCase
* PascalCase
* snake_case
* Sentence case
* ect..ect

Using an unsupported case style can cause problems with relations, breaking the GraphQL plugin, and many other unknown problems. As stated before in the future the Strapi team would like to add support for this but there is a lot of the internal API that needs to be rebuilt to split the backend schema from the frontend display names.

## Upgrading between versions

There are two ways to update from release to release, you can use the migration guides published [here](../migration-guides) to update from minor version to minor version, one by one.

Or if you have not made any major changes to your models controllers and services, you can use the simple guide published by DMehaffy [here](https://github.com/strapi/strapi/issues/1880).

## URL not defined

Upgrade to Node v10, version 8, 11 or anything above node 10 are not supported.

## Add user page is blank

If you are using Nginx to proxy your Strapi application with SSL you may hit an issue with the add user page showing a blank white screen, please see [this](https://github.com/strapi/strapi/issues/2424) issue for more information however you will need to modify your proxy block in your Nginx config to include the following:

```
location /content-manager {
  proxy_set_header X-Forwarded-Host 'strapi';
  proxy_pass http://localhost:1337;
}
```

## I have an infinite loader after put my app in production

Try to delete the line with key `plugin_content-manager_schema` inside the `core_store` in your database.

## The content type builder is not available is not display in the menu

When you are in production you don't have to update configurations or create new content type. It's not a good practice. So we block this function in production environment.
You have to make updates in development env and then push it in production.

## File upload on Heroku

As you maybe don't know, you can't create files on Heroku instances. Check the *[Ephemeral filesystem](https://devcenter.heroku.com/articles/dynos#ephemeral-filesystem)* of Heroku.

By default, your local server is set to upload files. Strapi offer you different upload providers you can install and use in your project like AWS S3 buckets or Cloudinary.

Find documentation about this [here](https://strapi.io/documentation/guides/upload.html#install-providers).
