# Create strapi app

This package includes the `create-strapi-app` CLI to make the creation of a strapi project lighter.

## How to use

### Quick usage (recommended)

Using yarn create command

```
yarn create strapi-app my-project
```

Using npx

```
npx create-strapi-app my-project
```

### Manual install

Using yarn

```
yarn global add create-strapi-app
create-strapi-app my-app
```

Using npm

```
npm install -g create-strapi-app
create-strapi-app my-app
```

### Non-interactive

`--non-interactive` skips every prompt. It requires a project directory.

With that flag, and no overriding flags, the defaults are:

- TypeScript
- no example app
- install dependencies
- initialize a git repository
- SQLite

Cloud login runs only when neither `--skip-cloud` nor `--non-interactive` is set. `--non-interactive` already skips it; `--skip-cloud` skips it on its own.

```
yarn create strapi-app my-project --non-interactive --skip-cloud
```

```
npx create-strapi-app my-project --non-interactive --skip-cloud
```
