# Strapi [![Build Status](https://travis-ci.org/wistityhq/strapi.svg?branch=master)](https://travis-ci.org/wistityhq/strapi) [![Slack Status](http://strapi-slack.herokuapp.com/badge.svg)](http://slack.strapi.io)

[Website](http://strapi.io/) - [Getting Started](#user-content-getting-started-in-a-minute) - [Documentation](http://strapi.io/documentation/introduction) - [Support](http://strapi.io/support)

Strapi is an open-source Node.js rich framework for building applications and services.

Strapi enables developers to focus on writing reusable application logic instead of spending time
building infrastructure. It is designed for building practical, production-ready Node.js applications
in a matter of hours instead of weeks.

The framework sits on top of [Koa](http://koajs.com/). Its ensemble of small modules work
together to provide simplicity, maintainability, and structural conventions to Node.js applications.

**DISCLAIMER**: *This version is maintained for criticals issues only*.

## Getting started in a minute

### Installation

Install the latest stable release with the npm command-line tool:

```bash
$ npm install strapi -g
```

### Link to the Strapi Studio

> We advise you to use our Studio to build APIs. To do so, you need to create a Strapi account.
[Go to the Strapi Studio to signup](http://studio.strapi.io).
Studio is dedicated to developers to build applications without writing
any single line of code thanks to its powerful set of tools.

After creating an account on the Strapi Studio, you are able to link your machine to your
Strapi Studio account to get access to all features offered by the Strapi ecosystem.
Use your Strapi account credentials.

```bash
$ strapi login
```

### Create your first project

You now are able to use the Strapi CLI. Simply create your first application and start the server:

```bash
$ strapi new <appName>
```

Note that you can generate a dry application using the `dry` option:

```bash
$ strapi new <appName> --dry
```

This will generate a Strapi application without:

- the built-in `user`, `email` and `upload` APIs,
- the `grant` hook,
- the open-source admin panel,
- the Waterline ORM (`waterline` and `blueprints` hooks disabled),
- the Strapi Studio connection (`studio` hook disabled).

This feature allows you to only use Strapi for your HTTP server structure if you want to.

### Start your application

```bash
$ cd <appName>
$ strapi start
```

The default home page is accessible at [http://localhost:1337/](http://localhost:1337/).

### Create your first API

The Strapi ecosystem offers you two possibilities to create a complete RESTful API.

#### Via the CLI

```bash
$ strapi generate api <apiName>
```

For example, you can create a `car` API with a name (`name`), year (`year`) and
the license plate (`license`) with:

```bash
$ strapi generate api car name:string year:integer license:string
```

#### Via the Strapi Studio

The Strapi Studio allows you to easily build and manage your application environment
thanks to a powerful User Interface.

Log into the Strapi Studio with your user account ([http://studio.strapi.io](http://studio.strapi.io))
and follow the instructions to start the experience.

![Strapi Studio](http://strapi.io/assets/screenshots/studio.png "Strapi Studio")
*Simply manage your APIs and relations thanks to the Strapi Studio.*

## Manage your data

Strapi comes with a simple but yet powerful dashboard.

![Strapi Dashboard](http://strapi.io/assets/screenshots/create.png "Strapi Dashboard")
*Create, read, update and delete your data.*

![Strapi Dashboard](http://strapi.io/assets/screenshots/permissions.png "Strapi Dashboard")
*Manage user settings, login, registration, groups and permissions on the fly.*

## Resources

- [Roadmap](ROADMAP.md)
- [Contributing guide](CONTRIBUTING.md)
- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi news on Twitter](https://twitter.com/strapijs)
