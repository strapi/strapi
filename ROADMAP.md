# Strapi Roadmap

***This is a living document, it describes what features we should implement in priority.***

This document could be influenced by the community feedback, security issues, stability, future needs, etc.

# Origins and purposes

The project originated from a desire to build a WordPress alternative by removing the front-end troubles and be an API-centric solution. More and more devices are coming to the market, it become impossible to have only one front-end application to handle each one of them. Each device has a specific front-end issues. However the backend part is still pretty the same. That's why, the APIs were introduced and became very important during the last few years. The APIs are also a new way to make business and involve a community on your product.

Strapi is a project supported by a company called Strapi (planned creation date in September/October, 2016). The purpose of Strapi is to provide a powerful way to manage your content across devices through an API. Strapi does not intend to be a MVC framework. Strapi will stay a free and open-source backend project with an user interface to easily manage content.

Strapi aims to be a Content Management Framework. Strapi was built with the "out-the-box" concept in mind. It let's developers hack and quickly develop custom business logic while keeping an administration interface to see what's is going on in the application.

In the near future, a marketplace will appear in the Strapi ecosystem. It will allow the community to publish plugins to extend Strapi projects.

# MVP (alpha)
### Framework layer

* ~~Re-wrote the whole framework in ES6~~
* ~~Divide framework in isolated parts (core, dictionary, websockets, models)~~
* ~~Improve performances (reduce codebase, new way to load hooks)~~
* ~~Developer Mongoose adapter~~
* ~~Re-integrate the CLI into the core~~
* ~~Load hook in specific order thanks to a `nextTo` property in the `package.json`~~
* Load plugins into the server (dictionary, controllers, models)
* Update `strapi-generate-new` to generate the new architecture to embrace plugins
* Develop plugins
  * API manager
  * Data Manager
  * Configurations Manager
  * Users & Groups
  * Permissions Manager
* Write ressources (documentation, tutorials)

### Administration layer

* ~~React structure~~
* Layout (~~design~~, development)
* Configurations Manager plugin (~~design~~, development)
* API Manager plugin (design, development)
* Data Manager plugin (design, development)
* Users & Groups plugin (design, development)
* Permissions Manager plugin (design, development)

# MVP (beta)
### Framework

* Integrate realtime events with Socket.io based on server/databases events
* Create a plugin generator
* Create GraphQL plugin


* Move to Koa 2 (waiting async/await native support)
* Use import/export instead of `require()` (waiting Node.js native support)

### Administration layer

* Internationalization
* ...
