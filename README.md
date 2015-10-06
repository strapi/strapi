# Strapi

[Website](http://strapi.io/) - [Getting Started](#user-content-getting-started-in-a-minute) - [Documentation](http://strapi.io/documentation) - [Support](http://strapi.io/support)

Strapi is an open-source Node.js rich framework for building applications and services.

Strapi enables developers to focus on writing reusable application logic instead of spending time
building infrastructure. It is designed for building practical, production-ready Node.js applications
in a matter of hours instead of weeks.

The framework sits on top of [Koa](http://koajs.com/). Its ensemble of small modules work
together to provide simplicity, maintainability, and structural conventions to Node.js applications.

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

### Start your application

```bash
$ cd <appName>
$ strapi start
```

The default home page is accessible at [http://localhost:1337/](http://localhost:1337/).

Strapi comes out of the box with an auto-generated admin panel, based on the models of your
application. This dashboard offers the opportunity to easily manage your data. You don't
need developer skills to use it.

The local admin dashboard is available at [http://localhost:1337/admin/](http://localhost:1337/admin/).

[![Strapi Admin Panel](http://strapi.io/assets/images/strapi-admin.jpg "Strapi Admin Panel")](http://strapi.io/documentation/admin)

Note: On the first login, you'll be asked to create the first admin profile.

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

## Resources

- [Roadmap](ROADMAP.md)
- [Contributing guide](CONTRIBUTING.md)
- [MIT License](LICENSE.md)

## Links

- [Strapi website](http://strapi.io/)
- [Strapi news on Twitter](https://twitter.com/strapijs)
