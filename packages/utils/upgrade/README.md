# Strapi Upgrade Tool

## Description

The Strapi Upgrade Tool is the CLI for facilitating upgrades between Strapi versions.

It handles updating a project's package.json with the correct version of Strapi, running the package installer, and running suggested code transforms for breaking changes (in major versions).

Once released, it will be the recommended way to update to any major, minor, and patch versions of Strapi instead of manually modifying package.json files.

The tool offers the following commands:

```
  major [options]     Upgrade to the next available major version of Strapi
  minor [options]     Upgrade to the latest minor and patch version of Strapi for the
                      current major
  patch [options]     Upgrade to latest patch version of Strapi for the current major
                      and minor
  codemods [options]  Run a set of available codemods for the selected target version
                      without updating the Strapi dependencies
```

### What's a codemod / code transform?

Codemods are a scripted way to refactor code. Here we are providing and running these scripts for users for any changes necessary in user code between Strapi versions.

For example, if we need to rename a package used by Strapi projects, instead of instructing users to change the import, we provide a script that searches through the user's project and does the replacement for them.

### Types of Transforms

The upgrade tool provides two types of transforms:

- `json`: for updating a project's .json files, primarily intended for the `package.json`
- `code`: codemods; for updating a project's .js and .ts files

### Data Migrations

Data migrations are not handled by the upgrade tool.

For Strapi v4, no data migrations will be allowed and no support is planned (except in extenuating circumstances eg, a critical security issue somehow relating to the database shape)

For Strapi v5, automated data migrations can be added in the `packages/core/database` package of the `v5/main` branch of this repo.

## Usage

This package is not yet released, so currently it can be run on a project in the monorepo /examples directory with the following command:

`../../packages/utils/upgrade/bin/upgrade`

Run the command with the `--help` option to see all the available options.

[Coming Soon] The Strapi Upgrade tool will be available using `npx @strapi/upgrade` and an alias for that within a project using `strapi upgrade`

## Writing a code transforms

To begin your code transform script, create a file `upgrade/resources/codemods/{X.X.X}/{short-description-of-action}.{code|json}.ts` where `X.X.X` is the target version of Strapi the codemod will be run for.

For example, all breaking changes for the initial release of Strapi v5 will go in `upgrade/resources/codemods/5.0.0`

Note that "short-description-of-action" will be converted to text displayed to the user with hyphens converted to spaces, for example: "short description of action"

### 'json' transforms

Your transform will be called for every json file in a user's project, and you must return the json object (modified or not) at the end to be passed to the next transform.

Here is an example JSON Transform script:

```typescript
import path from 'node:path';

import type { JSONTransform } from '../../..';

const transform: JSONTransform = (file, params) => {
  // Extract the json api and the cwd so we can target specific files
  const { cwd, json } = params;

  // To target only a root level package.json file:
  const rootPackageJsonPath = path.join(cwd, 'package.json');
  if (file.path !== rootPackageJsonPath) {
    // Return the json object unmodified to pass it to the next transform
    return file.json;
  }

  // Use json() to get useful helpers for performing your transform
  const j = json(file.json);

  const strapiDepAddress = 'dependencies.@strapi/strapi';

  // if this file contains a value at dependencies.@strapi/strapi
  if (j.has(strapiDepAddress)) {
    // we set the value to 5.0.0
    j.set(strapiDepAddress, '5.0.0');
  }

  // at the end we must return the modified json object
  return j.root();
};

export default transform;
```

For reference, these are the types for the relevant objects, which can be found in `packages/utils/upgrade/src/modules/json/types.ts`:

```typescript
export interface JSONTransformParams {
  cwd: string;
  json: (object: Utils.JSONObject) => JSONTransformAPI;
}

export interface JSONTransformAPI {
  get<T extends Utils.JSONValue>(path?: string, defaultValue?: T): T | undefined;
  has(path: string): boolean;
  set(path: string, value: Utils.JSONValue): this;
  merge(other: Utils.JSONObject): this;
  root(): Utils.JSONObject;
  remove(path: string): this;
}

export type JSONTransform = (file: JSONSourceFile, params: JSONTransformParams) => Utils.JSONObject;
```

The methods available from `json()` are wrappers for the lodash methods of the same name:

- **get(path, default)**: get path or default if not found
- **set(path, value)**: set path (such as 'engines.node', 'dependencies', 'author.name') to value
- **has(path)**: checks if path exists
- **merge(obj)**: merges two json objects
- **root()**: returns the whole json object
- **remove(path)**: removes the attribute given the path (such as 'dependencies.strapi')

### 'code' codemod transforms

Codemod transforms use the [`jscodeshift`](https://github.com/facebook/jscodeshift) library to modify code passed in. Please see their documentation for advanced details.

The `file` and `api` parameters come directly from the [jsoncodeshift arguments of the same name](https://github.com/facebook/jscodeshift#arguments).

```typescript
import type { Transform } from 'jscodeshift';

const transform: Transform = (file, api) => {
  // Extract the jscodeshift API
  const { j } = api;
  // Parse the file content
  const root = j(file.source);

  root
    // Find console.log calls expressions
    .find(j.CallExpression, {
      callee: { object: { name: 'console' }, property: { name: 'log' } },
    })
    // For each call expression
    .forEach((path) => {
      const { callee } = path.node;

      if (
        // Make sure the callee is a member expression (object/property)
        j.MemberExpression.check(callee) &&
        // Make sure the property is an actual identifier (contains a name property)
        j.Identifier.check(callee.property)
      ) {
        // Update the property's identifier name
        callee.property.name = 'info';
      }
    });

  // Return the updated file content
  return root.toSource();
};

export default transform;
```
