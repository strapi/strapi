---
title: Data Transfer
tags:
  - testing
  - e2e
  - data-transfer
  - infrastructure
---

## Overview

This document looks particularly at the `@strapi/data-transfer` package framed around how we use it with our test instances in the e2e test suite. It is not a comprehensive explanation of how to use `@strapi/data-transfer`. For that information you should [view the documentation](https://docs.strapi.io/developer-docs/latest/developer-resources/data-management.html) surrounding it.

## Why use Data Transfer?

Each test should be isolated and contained e.g. if you edit an entity in one test, the next test shouldn't know or care about it otherwise your tests need to run in a specific order and become flakey quite quickly.

So to solve this, you could use custom API endpoints of the application and whilst this isn't a poor solution it would _most likely_ require some code writing to set up the data for the schema entries. However, in `4.6.0` Strapi released the `DTS` feature (DTS – Data Transfer System). This means any member of Strapi can export the data of their instance producing a `.tar` that we can then import programatically restoring the database to this point in time and ensuring a "pure" test environment.

## Using Data Transfer

The full documentation of the feature can be seen [here](https://docs.strapi.io/developer-docs/latest/developer-resources/data-management.html). Below are a couple of scenarios you might find yourself.

### Creating a data packet

Because we're using a Strapi template for the test instance, it makes the most sense to add/edit the dataset in said templated instance. Begin by creating the instance:

```shell
yarn test:e2e
```

Then, you should be able to navigate to the app – `cd ./test-apps/test-app-XX`, the current content schemas should already be defined in there so you will be able to instantly import the current data packet to bring to life the test instance (instead of it being fresh):

```shell
yarn strapi import --file ../../../e2e/data/<backup-file-name>.tar
```

Once that's completed, you should be able to run your Strapi instance as usual:

```shell
yarn develop
```

> **Tip!**
> If you can't run the test-app because it is not present in the monorepo dependencies you can fix this by making the following change to the root monorepo `package.json` file and running `yarn install` at both the root of the monorepo and the test-app you are running.
>
> **This change should not be committed**.

```
  "workspaces": [
    ...
    "test-apps/e2e/*",
  ]
```

If you change any of the content schemas (including adding new ones) be sure to [update the `app-template`](./01-app-template.md) otherwise DTS will fail to import the data for schemas that do not exist.

### Exporting a data packet

Once you've created your new data from the test instance, you'll need to export
it. Since the Strapi CLI will use `@strapi/data-transfer` directly it will by default not export admin users, API tokens, or any other features that have been included in its exclusion list. For this reason, do not use the export command on the strapi test instance. A DTS engine has been created specifically for our tests cases. This allows us to redefine what should be included in the export for our tests. The script can be found in `/e2e/scripts/dts-export.js`

Be sure to include the content types you would like exported in the `ALLOWED_CONTENT_TYPES` array found in `e2e/constants.js`.

The script accepts the backup destination filename as a parameter. Run it from the directory
of your strapi test insance to create the backup.

```shell
node <PATH_TO_SCRIPT>/dts-export.js backup-with-admin-user
```

If you are exporting data for an EE feature you will need to run the script with the `STRAPI_LICENSE` env

```shell
STRAPI_LICENSE=<license-with-ee-feature> node <PATH_TO_SCRIPT>/dts-export.js backup-with-admin-user
```

Once this has been done, add the `.tar` backup to `/e2e/data` so the helper
functions can import it correctly.

As our suite of e2e tests grows we may hold more DTS backups in order to restore
the Strapi application to a desired state prior to testing.

### Importing in test scenarios

There's an abstraction for importing the data programmatically during tests named `resetDatabaseAndImportDataFromPath` found in `e2e/utils/dts-import.js`. Typically, you'll want to run this **before** each test:

```ts {2,5-8}
import { test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from './utils/dts-import';

test.describe('Strapi Application', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('backup.tar');
    await page.goto('/admin');
  });

  test('a user should be able to...', async ({ page }) => {
    // my test
  });
});
```

The path is relative to the root of the strapi project where you called `yarn test:e2e`.
