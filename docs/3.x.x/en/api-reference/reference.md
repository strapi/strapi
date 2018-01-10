# API Reference

  - strapi
    - [.admin](#strapiadmin)
    - [.app](#strapiapp)
    - [.bootstrap()](#strapibootstrap)
    - [.config](#strapiconfig)
    - [.controllers](#strapicontrollers)
    - [.hook](#strapihook)
    - [.koaMiddlewares](#strapikoaMiddlewares)
    - [.load()](#strapiload)
    - [.log](#strapilog)
    - [.middleware](#strapimiddleware)
    - [.models](#strapimodels)
    - [.plugins](#strapiplugins)
    - [.query()](#strapiquery)
    - [.reload()](#strapireload)
    - [.router](#strapirouter)
    - [.server](#strapiserver)
    - [.services](#strapiservices)
    - [.start()](#strapistart)
    - [.stop()](#strapistop)
    - [.utils](#strapiutils)


## strapi.admin

This object contains the controllers, models, services and configurations contained in the `./admin` folder.

## strapi.app

Returns the Koa instance.

## strapi.bootstrap

Returns a `Promise`. When resolved, it means that the `./config/functions/bootstrap.js` has been executed. Otherwise, it throws an error.

> Note: You can also access to the bootstrap function through `strapi.config.functions.boostrap`.

## strapi.config

Returns an object that represents the configurations of the project. Every JavaScript or JSON file located in the `./config` folder will be parsed into the `strapi.config` object.

## strapi.controllers

Returns an object of the controllers wich is available in the project. Every JavaScript file located in the `./api/**/controllers` folder will be parsed into the `strapi.controllers` object. Thanks to this object, you can access to every controller's actions everywhere in the project.

> Note: This object doesn't include the admin's controllers and plugin's controllers.

## strapi.hook

Returns an object of the hooks available in the project. Every folder that follows this pattern `strapi-*` and located in the `./node_modules` or `/hooks` folder will be mounted into the `strapi.hook` object.

## strapi.koaMiddlewares

Returns an object of the Koa middlewares found in the `./node_modules` folder of the project. This reference is very useful for the Strapi's core.

## strapi.load

Returns a function that parses the configurations, hooks, middlewares and APIs of your app. It also loads the middlewares and hooks with the previously loaded configurations. This method could be useful to update references available through the `strapi` global variable without having to restart the server. However, without restarting the server, the new configurations will not be taken in account.

## strapi.log

Returns the Logger (Pino) instance.

## strapi.middleware

Returns an object of the middlewares available in the project. Every folder in the `./middlewares` folder will be also mounted into the `strapi.middleware` object.

## strapi.models

Returns an object of models available in the project. Every JavaScript or JSON file located in the `./api/**/models` folders will be parsed into the `strapi.models` object. Also every `strapi.models.**` object is merged with the model's instance returned by the ORM (Mongoose, Bookshelf). It allows to call the ORM methods through the `strapi.models.**` object (ex: `strapi.models.users.find()`).

## strapi.plugins

Returns an object of plugins available in the project. Each plugin object contains the associated controllers, models, services and configurations contained in the `./plugins/**/` folder.

## strapi.query

Returns a function that will returns the available queries for this model. This feature is only available inside the plugin's files (controllers, services, custom functions). For more details, see the [ORM queries section](../plugin-development/backend-development.md#ORM queries).

## strapi.reload

Returns a function that reloads the entire app (with downtime).

## strapi.router

Returns the Router (Joi router) instance.

## strapi.server

Returns the [`http.Server`](https://nodejs.org/api/http.html#http_class_http_server) instance.

## strapi.services

Returns an object of services available in the project. Every JavaScript file located in the `./api/**/services` folders will be parsed into the `strapi.services` object.

## strapi.start

Returns a function that loads the configurations, middlewares and hooks. Then, it executes the bootstrap file, freezes the global variable and listens the configured port.

## strapi.stop

Returns a function that shuts down the server and destroys the current connections.

## strapi.utils

Returns a set of utils.
