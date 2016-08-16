# Strapi

[![npm version](https://img.shields.io/npm/v/strapi.svg)](https://www.npmjs.org/package/strapi)
[![npm downloads](https://img.shields.io/npm/dm/strapi.svg)](https://www.npmjs.org/package/strapi)
[![Build status](https://travis-ci.org/strapi/strapi.svg?branch=master)](https://travis-ci.org/strapi/strapi)
[![Slack status](http://strapi-slack.herokuapp.com/badge.svg)](http://slack.strapi.io)

## v3.0.0 coming soon...
We've been working on a major update to Strapi for several months now, rewriting the core framework and the administration panel.

Some parts of this work have been merged into our master branch. Currently, this is not stable. Please DON'T use the `master` in production. **To run and start your current project, we strongly recommend to use the v1.5.4.**

For more information on the upcoming version including the v2.0 abort, [read our blog post](http://blog.strapi.io/inside-the-box-july-2016/).

Thanks for your support!

## Why Strapi ?

> At [Strapi](http://strapi.io), everything we do we believe in changing the status quo of web development. Our products are simple to use, user friendly and production-ready.

Web and mobile applications needed a powerful, simple to use and production-ready API-driven solution. That's why we created Strapi, an open-source Content Management Framework (CMF) for managing and synchronizing your content (data, media) on multi-devices.

Halfway between a CMS and a framework, Strapi takes advantages of both worlds. A powerful administration panel to easily manage your content with a flexible framework layer to develop and integrate specific features.

## Features

- **100% JavaScript**, the language you probably already are using for the front-end.
- **Rock-solid foundation** offering plenty of possibilities for web apps and APIs.
- **Useful CLI** that let you scaffold projects and APIs on the fly.
- **Front-end agnostic** and can be used with React, Vue, Angular, Backbone, Ember, iOS, Android, etc.
- **Security layers** that just work and ships reusable security policies.
- **Smooth WebSockets** to handle realtime connections and events.
- **Mongo** as a main database. Also support others specific data layers.

## Plugins

> Only what you need. No more. No less.

Thanks to the plugins, you will be able to create the perfect app without useless features. The Strapi ecosystem has been thought to be the most granular as possible. Currently, we are building the main plugins to allow you to perform the same actions as on the v2.0.

- **Users Manager** will provide a full user management system. Also offers an authentication process.
- **APIs Manager** will generate powerful APIs into your app thanks to an UI in seconds instead of minutes.
- **Data Manager** will let your edit you content saved in your databases.
- **Configurations Manager** will allow you to edit your configurations files per environment.
- **Permissions Manager** will allow or disallow users to perform actions or not in your app.

Convinced? [Get started!](http://strapi.io/)

## Support

### Community support

For general help using Strapi, please refer to [the official Strapi documentation](./docs/). For additional help, ask a question on [StackOverflow](http://stackoverflow.com/questions/tagged/strapi).

The community discussions take place [on Slack](http://slack.strapi.io).

When opening [new issues](https://github.com/strapi/strapi/issues/new) or commenting on [existing issues](https://github.com/strapi/strapi/issues) on [GitHub](https://github.com/strapi/strapi), please make sure discussions are related to concrete technical issues of the Strapi framework.

Also, you can follow and ping the Strapi team on [Twitter](https://twitter.com/strapijs) and [Facebook](https://www.facebook.com/Strapi-616063331867161).

### Professional support

[Strapi](http://strapi.io), the company behind Strapi, provides a full range of solutions to get better results, faster. We're always looking for the next challenge: coaching, consulting, training, certifications, customization, etc. [Drop us an email](mailto:support@strapi.io) to see how we can help you.

## Badge board

| Package | Version | Dependencies |
|---------|---------|--------------|
| [strapi](./packages/strapi) | [![npm version](https://img.shields.io/npm/v/strapi.svg)](https://www.npmjs.org/package/strapi) | [![npm dependencies](https://david-dm.org/strapi/strapi.svg)](https://david-dm.org/strapi/strapi) |
| [strapi-bookshelf](./packages/strapi-bookshelf) | [![npm version](https://img.shields.io/npm/v/strapi-bookshelf.svg)](https://www.npmjs.org/package/strapi-bookshelf) | [![npm dependencies](https://david-dm.org/strapi/strapi-bookshelf.svg)](https://david-dm.org/strapi/strapi-bookshelf) |
| [strapi-cli](./packages/strapi-cli) | [![npm version](https://img.shields.io/npm/v/strapi-cli.svg)](https://www.npmjs.org/package/strapi-cli) | [![npm dependencies](https://david-dm.org/strapi/strapi-cli.svg)](https://david-dm.org/strapi/strapi-cli) |
| [strapi-generate](./packages/strapi-generate) | [![npm version](https://img.shields.io/npm/v/strapi-generate.svg)](https://www.npmjs.org/package/strapi-generate) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate.svg)](https://david-dm.org/strapi/strapi-generate) |
| [strapi-generate-api](./packages/strapi-generate-api) | [![npm version](https://img.shields.io/npm/v/strapi-generate-api.svg)](https://www.npmjs.org/package/strapi-generate-api) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-api.svg)](https://david-dm.org/strapi/strapi-generate-api) |
| [strapi-generate-controller](./packages/strapi-generate-controller) | [![npm version](https://img.shields.io/npm/v/strapi-generate-controller.svg)](https://www.npmjs.org/package/strapi-generate-controller) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-controller.svg)](https://david-dm.org/strapi/strapi-generate-controller) |
| [strapi-generate-generator](./packages/strapi-generate-generator) | [![npm version](https://img.shields.io/npm/v/strapi-generate-generator.svg)](https://www.npmjs.org/package/strapi-generate-generator) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-generator.svg)](https://david-dm.org/strapi/strapi-generate-generator) |
| [strapi-generate-hook](./packages/strapi-generate-hook) | [![npm version](https://img.shields.io/npm/v/strapi-generate-hook.svg)](https://www.npmjs.org/package/strapi-generate-hook) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-hook.svg)](https://david-dm.org/strapi/strapi-generate-hook) |
| [strapi-generate-migrations](./packages/strapi-generate-migrations) | [![npm version](https://img.shields.io/npm/v/strapi-generate-migrations.svg)](https://www.npmjs.com/package/strapi-generate-migrations) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-migrations.svg)](https://david-dm.org/strapi/strapi-generate-migrations) |
| [strapi-generate-model](./packages/strapi-generate-model) | [![npm version](https://img.shields.io/npm/v/strapi-generate-model.svg)](https://www.npmjs.org/package/strapi-generate-model) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-model.svg)](https://david-dm.org/strapi/strapi-generate-model) |
| [strapi-generate-new](./packages/strapi-generate-new) | [![npm version](https://img.shields.io/npm/v/strapi-generate-new.svg)](https://www.npmjs.org/package/strapi-generate-new) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-new.svg)](https://david-dm.org/strapi/strapi-generate-new) |
| [strapi-generate-policy](./packages/strapi-generate-policy) | [![npm version](https://img.shields.io/npm/v/strapi-generate-policy.svg)](https://www.npmjs.org/package/strapi-generate-policy) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-policy.svg)](https://david-dm.org/strapi/strapi-generate-policy) |
| [strapi-generate-service](./packages/strapi-generate-service) | [![npm version](https://img.shields.io/npm/v/strapi-generate-service.svg)](https://www.npmjs.org/package/strapi-generate-service) | [![npm dependencies](https://david-dm.org/strapi/strapi-generate-service.svg)](https://david-dm.org/strapi/strapi-generate-service) |
| [strapi-knex](./packages/strapi-knex) | [![npm version](https://img.shields.io/npm/v/strapi-knex.svg)](https://www.npmjs.org/package/strapi-knex) | [![npm dependencies](https://david-dm.org/strapi/strapi-knex.svg)](https://david-dm.org/strapi/strapi-knex) |
| [strapi-utils](./packages/strapi-utils) | [![npm version](https://img.shields.io/npm/v/strapi-utils.svg)](https://www.npmjs.org/package/strapi-utils) | [![npm dependencies](https://david-dm.org/strapi/strapi-utils.svg)](https://david-dm.org/strapi/strapi-utils) |

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
