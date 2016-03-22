---
title: Your first API
---

## Create your first API

It's pretty simple to generate an API with the Strapi CLI:

```bash
$ strapi generate api <apiName>
```

For example, you can create a `car` API with a name (`name`), year (`year`) and the license plate (`license`):

```bash
$ strapi generate api car name:string year:integer license:string
```

## Update your database

Migrations allow you to define sets of schema changes so upgrading a database is a breeze.

### Create a new migration file

To generate a migration file run:

```bash
$ strapi migrate:make <connection_name> <migration_name>
```

For example, if you want to create a migration file named `new_car_model` for the `car` API we just generated using the `default` connection the command looks like:

```bash
$ strapi migrate:make default new_car_model
```

Be careful, migrations are automatically generated based on your current database schema and models. We strongly advise you to manually verify those information.

### Run the migrations

Once you have finished writing the migrations, you can update the database by running:

```bash
$ strapi migrate:run <connection_name>
```

So if you want to run the previous migration generated for the `default` connection you need to run:

```bash
$ strapi migrate:run default
```

## Consume your API

You can take a look at the routes of the generated `car` API at `./api/car/config/routes.json`.
