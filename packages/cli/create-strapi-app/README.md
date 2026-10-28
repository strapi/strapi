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

`--non-interactive` also skips cloud login, so `--skip-cloud` is not needed with it.

```
yarn create strapi-app my-project --non-interactive
```

```
npx create-strapi-app my-project --non-interactive
```
