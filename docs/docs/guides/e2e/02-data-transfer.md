---
title: Data Transfer
tags:
  - testing
  - e2e
  - data-transfer
  - infrastructure
---

## Overview

This document explains how and why we use `@strapi/data-transfer` as means to reset and seed the database for end-to-end tests. It is not a comprehensive explanation of how to use `@strapi/data-transfer`. See the [Strapi documentation](https://docs.strapi.io/developer-docs/latest/developer-resources/data-management.html) to learn more about the feature.

### Why use Data Transfer?

We could use custom API endpoints of the application, and whilst this isn't a poor solution, it would _most likely_ require some code writing to set up the data for the schema entries. However, in `4.6.0` Strapi released the `DTS` feature (DTS – Data Transfer System). This means any member of Strapi can export the data of their instance and we can import it programmatically to restore the database to this point in time and ensure a "pure" test environment.

End-to-end fixtures live under `tests/e2e/data` as **unpacked export directories** (same layout as inside a Strapi `.tar`: `metadata.json`, `schemas/`, `entities/`, `links/`, `configuration/`, `assets/`, …). That way JSON and JSONL changes show up as normal text diffs in Git. Binary media stays under `assets/uploads/` (ignored by Prettier).

### Limitations of Data Transfer

Making changes to the data set should still be done with care: unknown changes to the database can impact other tests. Review JSONL and metadata diffs when updating fixtures.

## Updating data for tests

Each test should be isolated and not depend on another test. Data changes from one test should not leak into another test. For example, if you create a new entry for a content-type in one test case, it should not be present in the next test case. This makes tests more stable and easier to debug.

### The data transfer engine

Since the Strapi CLI will use `@strapi/data-transfer` directly it will by default not import or export admin users, API tokens, or any other features that have been included in its exclusion list.

For this reason, do NOT use the import or export command on the strapi test instance. A DTS engine has been created specifically for our tests cases. This allows us to redefine what should be included in the import or export for our tests. Helpers live in `tests/utils/dts-import.ts` (see also `tests/e2e/scripts/dts-export.ts` for exporting updated packets).

### Importing an existing data packet

When you need to update the data packet for a new test, you will first need a Strapi app with the data currently used in end-to-end tests.

When running the `yarn test:e2e` command, test app instances are created in `test-apps/e2e/test-app-{n}`. You can use one of the these apps to update the data.

Navigate to one of the test-apps and run `yarn install && yarn develop`

Leave the development server running, and then run the following command to reset and seed the database with the current e2e data packet. The script expects the name of the data packet you want to import found in `tests/e2e/data`.

```shell
STRAPI_LICENSE=<license-with-ee-feature> npx ts-node <PATH_TO_SCRIPT>/dts-import.ts with-admin
```

This script will include admin users and all the content-types specified in `tests/e2e/constants.ts`

You should be able to login with the test app instance credentials.

| Email            | Password    |
| ---------------- | ----------- |
| test@testing.com | Testing123! |

Now that you have a Strapi instance with the same data that each e2e starts with, you can modify the data in the CMS to prepare for a new data export.

> **Note:** If you change any of the content schemas (including adding new ones) be sure to [update the `app-template`](./01-app-template.md) otherwise DTS will fail to import the data for schemas that do not exist.

### Exporting an updated data packet

Once you've created your new data from the test instance, you'll need to export it so it can be used in the end-to-end tests.

Be sure to include the content types you would like exported in the `ALLOWED_CONTENT_TYPES` array found in `tests/e2e/constants.js`.

The script accepts the backup destination filename as an argument. Run it from the directory of the strapi instance you created earlier based on the test-app template.

```shell
npx ts-node <PATH_TO_SCRIPT>/dts-export.ts updated-data-packet
```

If you are exporting data for an EE feature you will need to run the script with the `STRAPI_LICENSE` env

```shell
STRAPI_LICENSE=<license-with-ee-feature> npx ts-node <PATH_TO_SCRIPT>/dts-export.ts updated-data-packet
```

The script will create a file `updated-data-packet.tar`. Extract it into a directory (same layout as Strapi’s export) and add that directory under `tests/e2e/data` (for example `tests/e2e/data/updated-data-packet/`) so tests can import from the folder and you can review changes as text. Remove the `.tar` after extracting if you only keep the unpacked tree in Git.

### Importing the data packet in test scenarios

There's an abstraction for importing the data programmatically during tests named `resetDatabaseAndImportDataFromPath` in `tests/utils/dts-import.ts`. Pass the name of a directory under `tests/e2e/data` (for example `with-admin`). You can still pass a path to a `.tar` file; the helper picks the file or directory source provider automatically. Typically, you'll want to run this **before** each test:

```ts
import { test } from '@playwright/test';
import { resetDatabaseAndImportDataFromPath } from './utils/dts-import';

test.describe('Strapi Application', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin');
    await page.goto('/admin');
  });

  test('a user should be able to...', async ({ page }) => {
    // my test
  });
});
```
