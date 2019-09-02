# Introduction

-----
Important Note: **Strapi 1.x is on maintenance only**. Development focuses on the upcoming Strapi 3.0. 

-----

Strapi is an open-source Node.js rich framework for building applications and services.

Strapi enables developers to focus on writing reusable application logic instead of spending time
building infrastructure. It is designed for building practical, production-ready Node.js applications
in a matter of hours instead of weeks.

The framework sits on top of [Koa](http://koajs.com/). Its ensemble of small modules work
together to provide simplicity, maintainability, and structural conventions to Node.js applications.

## Getting Started

### Installation

Install the latest stable release with the npm command-line tool:

```bash
$ npm install strapi -g
```


### Create your first project

You now are able to use the Strapi CLI. Simply create your first application and start the server:

```bash
$ strapi new <appName>
$ cd <appName>
$ strapi start
```

The default home page is accessible at [http://localhost:1337/](http://localhost:1337/).

### Create your first API

```bash
$ strapi generate api <apiName>
```

For example, you can create a `car` API with a name (`name`), year (`year`) and
the license plate (`license`) with:

```bash
$ strapi generate api car name:string year:integer license:string
```
## Alternatives

### Dry Application

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

### Create an API via the Strapi Studio

The Strapi Studio allows you to easily build and manage your application environment
thanks to a powerful User Interface.

Log into the Strapi Studio with your user account ([http://studio.strapi.io](http://studio.strapi.io))
and follow the instructions to start the experience.


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

## Key-features

### 100% JavaScript

Building on top of Strapi means your application is written entirely in JavaScript,
the language you and your team are already using in the browser.

Since you spend less time context-shifting, you're able to write code in a more consistent style,
which makes development more productive.

The entire Strapi framework is written in ES2015.

### Getting started quickly

Strapi provides a robust layer for fundamental web applications to help you write your business
logic, without obscuring Node.js features that you know and love. Our goal is to make writing
business logic much easier than other frameworks.

### Auto-generate REST APIs

Strapi comes with a generator that help jumpstart your application's backend without writing any code. Just run:

```bash
$ strapi generate api car
```
and you'll get an API that lets you read, paginate, sort, filter, create, destroy, update,
and associate cars.

### Security

We take security very seriously. This is why Strapi comes with several security layers that just work
depending on your needs. Strapi provides configuration for CORS, CSRF, CSP, X-Frame-Options, XSS, HSTS,
HTTPS, SSL, proxy, IP filtering and ships reusable security policies.

No matter what you need to secure, Strapi is the right tool to make it right.

### Datastore-agnostic

Strapi comes installed with a powerful ORM/ODM called Waterline, a datastore-agnostic tool that
dramatically simplifies interaction with one or more databases.

It provides an abstraction layer on top of the underlying database, allowing you to easily query
and manipulate your data without writing vendor-specific integration code.

Strapi offers a new take on the familiar relational model, aimed at making data modeling more practical.
You can do all the same things you might be used to (one-to-many, many-to-many), but you can also assign
multiple named associations per-model. Better yet, you can assign different models to different databases,
and your associations/joins will still work, even across NoSQL and relational boundries.

Strapi has no problem implicitly/automatically joining a SQL table with a NoSQL collection and vice versa.

### Front-end agnostic

Strapi is compatible with any front-end strategy; whether it's Angular, Backbone, Ember,
iOS, Android, Windows Phone, or something else that hasn't been invented yet.

Plus it's easy to serve up the same API to be consumed by another web service or community of developers.

### Convention over configuration

Convention over configuration is a consistent approach makes developing applications more
predictable and efficient for everybody involved.

If anyone on your team has worked with frameworks, Strapi will feel pretty familiar.
Not only that, but they can look at a Strapi project and know, generally, how to code up the basic
patterns they've implemented over and over again in the past; whether their background.
What about your second application, or your third? Each time you create a new Strapi application,
you start with a sane, familiar boilerplate that makes you more productive.

Configuration files give you extra opportunities for human error.

In many cases, you'll even be able to recycle some of your code.

### Error Handling

By default outputs all errors to `stderr` unless `NODE_ENV` is `test`.
To perform custom error-handling logic such as centralized logging you can add an "error" event listener:

```js
strapi.app.on('error', function (err) {
  strapi.log.error('server error', err);
});
```

If an error in the req/res cycle and it is not possible to respond to the client,
the `Context` instance is also passed:

```js
strapi.app.on('error', function (err, ctx) {
  strapi.log.error('server error', err, ctx);
});
```

When an error occurs and it is still possible to respond to the client,
aka no data has been written to the socket, Strapi will respond appropriately with
a 500 "Internal Server Error". In either case an app-level "error" is emitted for logging purposes.

### Different environments

Strapi has built in support for the idea of having a different set of settings for each environment.
Real applications have this too, but often the framework around them doesn't accommodate it and
you end up having to swap configuration files in and out to achieve the same effect.

### Loose coupling

Strapi is flexible enough to allow you to explore and create when you have the time to but also
provides automation tools when you don't.
