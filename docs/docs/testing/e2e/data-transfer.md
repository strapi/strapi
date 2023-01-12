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

Each test should be isolated and contained e.g. if you edit an entity in one test, the next test shouldn't know or care about it otherwise your tests need to be ran in a specific order and become flakey quite quickly.

So to solve this, you could use custom API endpoints of the application and whilst this isn't a poor solution it would _most likely_ require some code writing to set up the data for the schema entries. However, in `4.6.0` Strapi released the `DTS` feature, DTS – Data transfer system. This means any member of Strapi can export the data of their instance producing a `.tar` that we can then import programatically restoring the database to this point in time and ensuring a "pure" test environment.

## Using Data Transfer

The full documentation of the feature can be seen [here](https://docs.strapi.io/developer-docs/latest/developer-resources/data-management.html). Below are a couple of scenarios you might find yourself.

:::warning
Admin users and API tokens are not exported. Therefore, restored data does not include the users table, which means that createdBy and updatedBy are empty in a restored instance. Relations between entities are also broken in the import/export sequence.
:::

### Creating a data packet

Because we're using an Strapi template for the test instance, it makes the most sense to add/edit the dataset in said templated instance. Begin by creating the instance:

```shell
yarn test:e2e:setup
```

Then, you should be able to navigate to the app – `cd ./test-apps/playwright`, the current content schemas should already be defined in there so you will be able to instantly import the current data packet to bring to life the test instance (instead of it being fresh):

```shell
yarn strapi import --file ../../e2e/data/backup.tar
```

Once that's completed, you should be able to run your Strapi instance as usual:

```shell
yarn develop
```

If you change any of the content schemas (including adding new ones) be sure to update the `app-template` otherwise DTS may have trouble importing the data as it cannot create schema files on the fly.

### Exporting a data packet

Once you've created your new data from the test instance, you'll need to export it:

```shell
yarn strapi export --file backup --no-encrypt --no-compress
```

Once this has been done, replace the existing `backup.tar` in `/e2e/data` so the helper functions can import it correctly.

### Importing in test scenarios

There's an abstraction for importing the data programtically during tests named `resetDatabaseAndImportDataFromPath` found in `e2e/scripts/data-transfer.js`. Typically, you'll want to run this **before** each test:

```ts {2,5-8}
import { test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from './scripts/data-transfer';

test.describe('Strapi Application', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('./e2e/data/backup.tar');
    await page.goto('/admin');
  });

  test('a user should be able to...', async ({ page }) => {
    // my test
  });
});
```

The path is relative to the root of the strapi project where you called `yarn test:e2e`.
