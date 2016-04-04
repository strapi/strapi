# How it works

Before you start: make sure [you've installed the Strapi node module](./installation/index.html)-- it should only take a minute!

## Create a project

First, we need to create a directory to hold your application:

```bash
$ strapi new appName
```

## Start your application

To run the server, make that your working directory and simply start your application:

```bash
$ cd appName
$ strapi start
```

!!! note
    The default home page is accessible at [http://localhost:1337/](http://localhost:1337/).

## Anatomy

Now that you have the generated directory let's see what we have.

### APIs

The `./api` directory contains the vast majority of your app's back-end logic. It is home to the "M" and "C" in [MVC Framework](http://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller).

Every API is composed of:

- Routes of the API and config that can be different for each environment.
- Controllers contain most of the back-end logic for your API.
- Models are the structures that contain data for your API.
- Policies are typically used to authenticate clients and restrict access to certain parts of your API.
- Services are similar to controller actions. They contain logic that used by your API that doesn't necessarily rely on the requests and the responses.

### Configuration

The `./config`  directory is full of config that will allow you to customize and configure your application.

In `./config/locales` is where you can add translations as JSON key-value pairs. The name of the file should match the language that you are supporting, which allows for automatic language detection based on request headers.

The `./config/environments`  directory contains various environment settings such as API keys or remote database passwords. The environment directory used is determined by the environment Strapi is going to be running in.

The `./config/functions` directory contains lifecycle functions for your application such as CRON tasks and bootstrap jobs.

### Data info

The `./data` directory contains all the migration files for every connection and your database index if you're using SQLite.

### Public assets

The `./public` directory houses all of the static files that your application will need to host.

### Views

The `./views` directory holds all of your custom views for template engines like EJS, Handlebars, Jade, etc.

!!! important
    Note that views are disabled by default and the directory doesn't exist since the philosophy of Strapi is to be API first.

## Your first API

### Create your first API

It's pretty simple to generate an API with the Strapi CLI:

```bash
$ strapi generate:api apiName
```

For example, you can create a `car` API with:

```bash
$ strapi generate:api car
```

### Update your database

Migrations allow you to define sets of schema changes so upgrading a database is a breeze.

#### Create a new migration file

To generate a migration file run:

```bash
$ strapi migrate:make connection_name migration_name
```

For example, if you want to create a migration file named `new_car_model` for the `car` API we just generated using the `default` connection the command looks like:

```bash
$ strapi migrate:make default new_car_model
```

!!! warning
    Be careful, migrations are automatically generated based on your current database schema and models. We strongly advise you to manually verify those information.

#### Run the migrations

Once you have finished writing the migrations, you can update the database by running:

```bash
$ strapi migrate:run connection_name
```

So if you want to run the previous migration generated for the `default` connection you need to run:

```bash
$ strapi migrate:run default
```

### Consume your API

You can take a look at the routes of the generated `car` API at `./api/car/config/routes.json`.

## Enter the REPL

### Start the REPL

Now that the `car` API is generated and the database upgraded thanks to a migration, you are ready to access your API.

Let's start your application with an opened REPL:

```bash
$ strapi console
```

This let you start your application, and enter the [Node.js REPL](https://nodejs.org/api/repl.html). This means you can access and use all of your models, services, configuration, and much more. Useful for trying out queries, quickly managing your data, and checking out your project's runtime configuration.

### Access global objects

You can access the Strapi global object with `strapi`. Your generated `car` API is accessible at `strapi.api.car`. If you want to output the `car` API object it should look like this:

```bash
> strapi.api.car
```

If you need to take a look at your current used config, simply run:

```bash
> strapi.config
```
