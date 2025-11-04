# v4-schemas

This is an example Strapi v5 application that includes schemas copied from the v4 project located at `../v4`.

## Schemas Included

This project includes the following content types from the v4 project:

- **basic-live** - A collection type with various field types (no draft/publish)
- **basic-draft** - A collection type with various field types (with draft/publish)
- **relations-live** - A collection type demonstrating various relations (no draft/publish)
- **relations-draft** - A collection type demonstrating various relations (with draft/publish)

And the following components:

- **shared.simple-info** - Simple info component
- **shared.image-block** - Image block component

## Requirements

- Docker
- Docker compose
- Node

## Installation

By default once you have setup the monorepo you will be able to run this app with a sqlite DB directly.

If you wish to run this app with another database you can use the `docker-compose.dev.yml` file at the root of the directory.

### start the databases

Run the following command at the root of the monorepo

```
docker-compose -f docker-compose.dev.yml up -d
```

If you need to stop the running databases you can stop them with the following command:

```
docker-compose -f docker-compose.dev.yml stop
```

### run the app with a specific database

```
DB={dbName} yarn develop
```

**Warning**

You might have some errors while connecting to the databases.
They might be coming from a conflict between a locally running database instance and the docker instance. To avoid the errors either shutdown your local database instance or change the ports in the `./config/database.ts` and the `docker-compose.dev.yml` file.
