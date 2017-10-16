# Strapi Roadmap

***This is a living document, it describes what features we should implement in priority.***

This document could be influenced by the community feedback, security issues, stability, future needs, etc.

# Origins and purposes

Strapi is a project supported by a company called Strapi Solutions. The purpose of Strapi is to provide a powerful way to manage your content across devices through an API. Strapi does not intend to be a MVC framework. Strapi will stay a free and open-source backend project with an user interface to easily manage content.

Strapi aims to be a Content Management Framework. It lets developers hack and quickly develop custom business logic while keeping an administration interface to see what's is going on in the application. Strapi has been designed to build scalable moderns apps using a service-oriented architecture. Strapi will fit with any web project that requires an API.

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
- ~~Improve `strapi-bookshelf` and `strapi-mongoose` adapters.~~
- ~~Improve the way we are injecting plugins into the dashboard.~~
- ~~Create plugin helper to share utils between plugins (`strapi-helper-plugin`).~~
- ~~Prototype the plugins queries process to be able to use different ORMs.~~
- ~~Prototype the CLI to create, install and uninstall plugins.~~
- ~~Ensure that we are compatible with Node 8.~~

`strapi@alpha.5`:
- ~~[Plugin] Settings Manager~~.
- ~~Update layout design~~.
- ~~Create a draft of the guidelines to follow of how to create a plugin~~.
- ~~Initialize the `docs` folder~~.
- ~~Synchronize the ORM adapters to set the same properties in the AST~~.
- ~~Rewrite the Strapi core to improve performances and startup time~~.
- ~~Freeze (make immutable) the AST~~.
- ~~Remove global variable `strapi` and use the module pattern instead~~.
- ~~Use Bootstrap v4@alpha.6~~.
- ~~Use i18n in the notifications messages~~.
- ~~Remove old/deprecated folders (test, website)~~.
- ~~Use Pino as logger~~.

`strapi@alpha.6` *(expected release date: 21/09/2017)*:
- ~~[Admin] Reduce number of steps to be able to contribute~~.
- ~~[Admin] Reduce bundle size by sharing commons dependencies~~.
- ~~[Admin] Update `strapi-helper-plugin` and `strapi-admin` dependencies to the latest version~~.
- ~~[Plugin] Content Manager~~.
- ~~[Plugin] Content Type Builder~~.
- ~~[Plugin] Finalize the query process to be able to use different ORMs~~.
- ~~[Plugin] Execute `bootstrap` function before mounting~~.
- ~~[Plugin] Execute `requirement` function to allow or not rendering~~.
- ~~[Framework] Support filters parameters~~.
- ~~Write new documentation~~.

`strapi@alpha.7` *(expected release date: 24/11/2017)*:
- [Admin] Define push area into the plugins.
- [Admin] Harmonise sharing components between plugins.
- [Admin] `List plugins` page.
- [Admin] Use latest available version of Bootstrap.
- [Plugin] Users & groups (with full authentication process).
- Improve generated APIs (especially the relation part).

`strapi@alpha.8` *(expected release date: 22/12/2017)*:
- [Plugin] Upload.
- [Plugin] Email.
- [Plugin] GraphQL.
- [Plugin] Content Manager v2
  - Search (filters).
  - WYSWYG.
  - Required relation.
- Re-design & improve the DX of the validations layer.

`strapi@alpha.9` *(expected release date: 19/01/2018)*:
- [Plugin] Be able to reinstall a plugin without loosing the user's configurations.
- [Plugin] Settings Manager v2 (add/update configurations in each every environment).
- HTTP/2.
