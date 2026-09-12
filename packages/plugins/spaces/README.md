# @strapi/spaces

Multi-tenancy for Strapi. One project, one schema, one deployment — several
tenants, each with its own entries, media and members.

Enterprise feature. See the [contributor
documentation](../../../docs/docs/docs/01-core/spaces/00-intro.md) for the
design.

## What a space owns

Rows, not schemas. Every space sees the same content types, because there is one
Content-Type Builder and one database schema; what differs is which entries,
assets, releases and workflows each space can reach.

That fits the case Spaces exists for: one company running French and German
sites off one Article model, each team managing its own articles. It does not
give a tenant its own content model, deployment, database or resource budget —
a customer who needs those needs separate projects.

## Getting started

Spaces ships with `@strapi/strapi` and loads automatically on an Enterprise
licence carrying the `cms-spaces` feature.

On first boot it creates one space and assigns every existing row to it, so a
project that had content before Spaces was switched on keeps it, in one place.
Administrators are added to spaces from **Settings → Spaces**.

The admin sends the space it is working in as a header:

```
X-Strapi-Space: france     one space
X-Strapi-Space: *          every space at once, with the right permission
```

Absent, the server puts the caller in their default space. The header is
validated on every request — remembering it in the browser is a convenience, not
an authorisation.

## Opting a content type out

Content types a project defines are scoped by default. Reference data shared by
every tenant can opt out:

```json
{
  "pluginOptions": {
    "spaces": { "scoped": false }
  }
}
```

## Configuration

```js
// config/plugins.js
module.exports = {
  spaces: {
    config: {
      // Cap the number of spaces below whatever the licence allows.
      maxSpaces: null,
      // Assign existing content to a first space on boot. Turning this off
      // leaves that content shared with every space.
      migrateOnBootstrap: true,
    },
  },
};
```

## Tests

```bash
yarn jest --config packages/plugins/spaces/jest.config.js --rootDir packages/plugins/spaces
yarn test:api tests/api/plugins/spaces          # needs an EE licence
yarn test:e2e --domains spaces                  # needs an EE licence
```

The enforcement itself is also covered against a real database in
`packages/core/database/src/__tests__/query-scopes-sqlite.test.ts`, which needs
no licence.
