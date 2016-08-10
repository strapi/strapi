# strapi-generate-migrations

[![npm version](https://img.shields.io/npm/v/strapi-generate-migrations.svg)](https://www.npmjs.org/package/strapi-generate-migrations)
[![npm downloads](https://img.shields.io/npm/dm/strapi-generate-migrations.svg)](https://www.npmjs.org/package/strapi-generate-migrations)
[![npm dependencies](https://david-dm.org/strapi/strapi-generate-migrations.svg)](https://david-dm.org/strapi/strapi-generate-migrations)
[![Build status](https://travis-ci.org/strapi/strapi-generate-migrations.svg?branch=master)](https://travis-ci.org/strapi/strapi-generate-migrations)
[![Slack status](http://strapi-slack.herokuapp.com/badge.svg)](http://slack.strapi.io)

This Strapi generator generates migration files for a Strapi application.

Creating new migration files can be achieved by running:

```bash
$ strapi migrate:make <connectionName> <migrationName>
```

Once you have finished writing the migrations, you can update the database by running:

```bash
$ strapi migrate:run <connectionName>
```

## Resources

- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi community on Slack](http://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
