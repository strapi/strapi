# Linking the Strapi Design System

Follow these steps to use a local version of the Strapi design system with the Strapi monorepo

First, run `yarn build` in `strapi-design-system/packages/strapi-design-system` to generate the bundle.

In your copy of Strapi, you can link the design system using either a [relative path](#relative-path) or [yarn link](#yarn-link).

### Relative path

Replace the version number in both `strapi/packages/core/admin/package.json` and `strapi/packages/core/helper-plugin/package.json` with the relative path to your copy of the design system:

```
"@strapi/design-system": "link:../../../../strapi-design-system/packages/strapi-design-system"
```

### Yarn link

Alternatively, you can use [`yarn link`](https://classic.yarnpkg.com/lang/en/docs/cli/link/) by first running `yarn link` in `strapi-design-system/packages/design-system` and then `yarn link @strapi/design-system` in both `strapi/packages/core/admin` and `strapi/packages/core/helper-plugin`. With this approach, no changes need to be made to the `package.json`

Once the link is setup, run the following command from the root of the monorepo

```
yarn lerna clean && yarn setup
```
