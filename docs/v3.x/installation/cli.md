# Installing from CLI

Fast-track local install for getting Strapi running on your computer.

[[toc]]

## Step 1: Make sure requirements are met

#### Node.js

Strapi only requires [Node.js](https://nodejs.org). The current recommended version to run Strapi is **Node v12** (please note that Node v14 is **not supported** at this time and does not go into LTS until the end of October 2020).

This is everything you need to run Strapi on your local environment.

| Software | Minimum version |
| -------- | --------------- |
| Node.js  | 12.x            |
| npm      | 6.x             |

#### Yarn (optional)

You can also use **yarn** if you want [here](https://yarnpkg.com/en/docs/getting-started) are the instructions to get started with it.

#### Databases

Strapi currently support the following databases.

| Database   | Minimum version |
| ---------- | --------------- |
| SQLite     | 3               |
| PostgreSQL | 10              |
| MySQL      | 5.6             |
| MariaDB    | 10.1            |
| MongoDB    | 3.6             |

## Step 2: Create a new project

:::: tabs

::: tab yarn

```bash
yarn create strapi-app my-project --quickstart
```

:::

::: tab npx

```bash
npx create-strapi-app my-project --quickstart
```

:::

::::

::: tip
If you want to use specific database, you don't have to use the `--quickstart` flag. The CLI will let you choose the database of your choice.
:::

::: warning
If you use a custom database, this one has to be up and running before creating your Strapi project
:::

## Step 3: Start the project

To start your Strapi application you will have to run the following command in your application folder.

:::: tabs

::: tab yarn

```bash
yarn develop
```

:::

::: tab npm

```bash
npm run develop
```

:::

::::

::: tip
If you created your application using `--quickstart` flag, it will automatically run your application.
:::
