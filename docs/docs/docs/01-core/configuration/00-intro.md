---
title: Introduction
tags:
  - configuration
---

# Configuration

This section is an overview of how configuration files are loaded in Strapi and how they should be used.

## Config loading

Loading of configuration is the very first thing Strapi does in bootstrap (after setting signal handlers), which is necessary because most of the Strapi bootstrap process depends on values from the configuration.

This means that configuration loading happens even before Strapi creates a logger. Therefore any errors or warnings from the configuration unfortunately must output to `console`

NOTE: For now. in theory, we could define some configuration files that do not depend on being passed a `strapi` object and could provide logger settings in there, but at this time we do not have that capability.

Currently, Strapi loads every .js and .json file within a project's `./config` directory directly into the strapi config object. That is, if there is a file called `./config/myconfig.js` it will be loaded automatically and accessible from `strapi.config.get('myconfig')`

(NOT YET IMPLEMENTED) Starting in Strapi v5, will load every defined value from the `STRAPI_` environment namespace into the configuration, using underscore (\_) as the object delimiter. For example, if you define `STRAPI_ADMIN_APP_KEYS=abcd,efg` it will be available from `strapi.config.get('admin.app.keys')` as `['abcd', 'efg']`

Along with that feature, all configuration values will become case-insensitive. That is, accessing `strapi.config.get('admin.App.Keys')` will return the same value as `strapi.config.get('admin.app.keys')`.

## Base Strapi Configurations

The following are considered 'base' Strapi configurations and a description of what each file contains is given, so that new settings can be placed in the appropriate place.

A Strapi configuration file must export either an object, or a function that returns an object.

WARNING: There are some discrepancies where certain configuration files such as middlewares may return an array and some files may not be able to export a function. Please confirm before use, and update this documentation when exceptions are found.

(NOT YET IMPLEMENTED) Starting in Strapi v5, the contents of the base configurations will be strictly defined and no values that are not created by Strapi will be allowed in them; that is, an error will be thrown on unrecognized values. Any user additions must go in separate configuration namespaces.

### Base Config Names

#### admin

Defines settings related to the Strapi admin panel, such as the 'autoopen' option for `yarn develop`

#### server

Defines settings related to the Strapi backend server, such as 'host' and 'port'

#### database

Defines the database configuration options.

NOTE: Most of this is defined by Knex, be careful when adding options that they are compatible or placed in the appropriate location

#### api

Content API configuration, for example the 'rest.maxLimit' option to set the maximum `limit` available in a query.

#### features

Feature flags for enabling and configuring future features that would be breaking changes and cannot be enabled by default, or experimental features that are not ready for public stable release.

#### plugins

Contains plugin configurations, with each root-level value the id of a plugin, for example, 'users-permissions'

IMPORTANT: Plugins are not loaded like other Strapi configurations into the `plugins.` namespace, because they are loaded during the module loading.
That means that in an example plugins.js file like below, its values are accessible at, for example, `strapi.config.get('plugin::graphql.endpoint')`

```
module.exports = () => ({
  graphql: {
    enabled: true,
    config: {
      endpoint: '/graphql',

      defaultLimit: 25,
      maxLimit: 100,

      apolloServer: {
        tracing: true,
      },
    },
  },
});
```

NOTE: Because this configuration contains user and plugin keys and Strapi does not yet provide a method to extend the definitions, this configuration is not strictly typed and will not be loaded from the environment variables

#### middlewares

The configuration of middlewares.

NOTE: This is the only configuration that is currently an array rather than an object. It also very loosely typed. Future improvements are planned to strongly type all the built-in Strapi middlewares.

### Typings

Most of the base configurations have been typed, although they are not currently publicly available. They can be found in: `packages/core/types/src/types/core/config`

Any time a new configuration option is added to Strapi, it must also be added to the types for the appropriate config file (and once the env var loading feature is available, a parser for it such as string, integer, stringArray, etc must be defined)

In Strapi v5, they will be used for:

- user-facing config factories to assist in typing project configuration
- as part of the environment variable configuration loading to validate the structure of the base config file parsers to parse and strongly type values from the environment

### Configuration filename restrictions

In Strapi v5, environment variables with the prefix `STRAPI_` will be loaded automatically into Strapi configuration. Because of that, some naming restrictions have been added to prevent conflicts.

- filenames without extension must be case-insensitive unique (ie, only one file among ADMIN.js and admin.js or admin.js and admin.json)
- All base Strapi configurations and a set of restricted names currently found in `packages/core/core/src/configuration/config-loader.ts` may not be used **even as prefixes**

IMPORTANT: Any new base Strapi configurations should also be limited to a-z0-9, no special characters! This is necessary to allow environment variable loading. The same restriction does not apply to user config files, but if not followed that file will not support autoloading env.

### Base attribute name restrictions

Configuration options defined for Strapi configurations must include only a-zA-Z0-9! If a key is used with a special character, underscore, or dash, it will not be configurable from the environment variables, and people will get angry that it was poorly designed. Please use camelCase like all existing Strapi configuration keys. There are not currently any special characters defined in Strapi configurations, with the sole exception of plugins.js 'users-permissions', please keep it that way.
