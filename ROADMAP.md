# Strapi Roadmap

***This is a living document, it describes what features we should implement in priority.***

This document could be influenced by the community feedback, security issues, stability, future needs, etc.

# Origins and purposes

Strapi is a project supported by a company called Strapi Solutions. The purpose of Strapi is to provide a powerful way to manage your content across devices through an API. Strapi does not intend to be a MVC framework. Strapi will stay a free and open-source backend project with an user interface to easily manage content.

Strapi aims to be a Content Management Framework. It let's developers hack and quickly develop custom business logic while keeping an administration interface to see what's is going on in the application. Strapi has been designed to build scalable moderns apps using a service-oriented architecture. Strapi will fit with any web project that requires an API.

For more details, [please read our blog](http://blog.strapi.io).

# ETA (v3)

### α alpha
**Expected release date: 20/12/2016**

**Note:** This version will not be ready for production use. However, we will publish it on npm to allow the community to test it and give us feedback.

`strapi@alpha.1`
* ~~Rewrite the entire project with ES6.~~
* ~~Move to Koa2. [(see current status)](https://github.com/strapi/strapi/issues/41).~~
* ~~Use Mongo as main database.~~
* ~~Use Joi as validation layer.~~
* ~~Load plugins.~~
* ~~Load external hooks.~~
* ~~Build dashboard layout using React.~~
* ~~Dynamic configuration values.~~
* ~~Handle internationalization (i18n).~~

[`strapi@alpha.2`](https://github.com/strapi/strapi/pull/176)
* ~~Ignore `node_modules` and `admin` folders when auto-reload is enabled.~~
* ~~Apply defaults configurations values on `strapi.config.hooks.xxx`.~~
* ~~Handle errors with Boom.~~
* ~~Allow CLI to generate an API into another API.~~
* ~~Use ESLint instead of xo.~~
* ~~Update databases configurations to allow different connectors.~~

`strapi@alpha.3`
_Reorganize the mono-repository. The rule to follow is to only have hooks without which Strapi cannot start or the CLI is unusable._
- ~~Move `strapi-settings-manager` to the main repository~~
- ~~Better handling for 404~~
- ~~Update the generated API's files with async/await pattern~~

`strapi@alpha.4`:
- [Plugin] Content Manager
- Update React-Boilerplate to the latest version.
- Implement Jest instead of Mocha. (only if we could see performances improvements)
- Give the ability to create a log file (thanks to Winston).
- Write better tests.
- Improve `strapi-bookshelf` thanks to the work done by @dj-hedgehog and his team.


### β beta
**Expected release date: 01/04/2017**

* Remove harmony flag.
* Load custom hooks.
* Create plugin generator.
* [Plugin] Users & groups.
* [Plugin] Permissions Manager.
