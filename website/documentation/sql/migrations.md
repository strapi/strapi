# Migrations

Migrations allow you to evolve your database schema over time. Rather than write schema modifications in pure SQL, migrations allow you to describe changes to your tables.

You can think of each migration as being a new "version" of the database. A schema starts off with nothing in it, and each migration modifies it to add or remove tables, columns, or entries. Strapi knows how to update your schema along this timeline, bringing it from whatever point it is in the history to the latest version.

## Create a new migration file

To generate a migration file run:

```bash
$ strapi migrate:make connection_name migration_name
```

For example, if you want to create a migration file named `new_car_model` for the `car` API we just generated using the `default` connection the command looks like:

```bash
$ strapi migrate:make default new_car_model
```

## How it works

Migration files for each connection can be found in `./data/migrations`.

!!! warning
    Be careful, migrations are automatically generated based on your current database schema and models. We strongly advise you to manually verify those information.

The migrations use the [schema builder](./models/index.html) to update your database schema.

For every migration there is a `up` and a `down` logic. The `up` logic corresponds to the new updates to apply to the connection. The `down` logic is the "mirror" of the `up` logic-- it's the logic to rollback this migration.

## Transactions

Transactions are an important feature of relational databases, as they allow correct recovery from failures and keep a database consistent even in cases of system failure. All queries within a transaction are executed on the same database connection, and run the entire set of queries as a single unit of work. Any failure will mean the database will rollback any queries executed on that connection to the pre-transaction state.

By default, each migration is run inside a transaction. Whenever needed, one can disable transactions per-migration, via exposing a boolean property from a migration file:

```js
exports.config = {
  transaction: false
};
```

## Run the migrations

Once you have finished writing the migrations using the schema builder, you can update the database by running:

```bash
$ strapi migrate:run connection_name
```

So if you want to run the previous migration generated for the `default` connection you need to run:

```bash
$ strapi migrate:run default
```

## Seeding

Seed files are created in the `./data/seeds` directory.

Seeds allow you to populate your database with inserted data. For every migration there is a seed file.
