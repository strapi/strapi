# Strapi GraphQL

This plugin will add GraphQL functionality to your app.
By default it will provide you with most of the CRUD methods exposed in the Strapi REST API.

To learn more about GraphQL in Strapi [visit documentation](https://docs.strapi.io/developer-docs/latest/plugins/graphql.html)

## HTTP server (Apollo) configuration

- **Default (no migration required):** `apolloServer` in `config/plugins` is merged into **Apollo Server v4** exactly as before.
- **Explicit server block:** optional `server` selects the transport and version:

```js
// config/plugins.js — opt-in Apollo v5 or explicit v4
module.exports = {
  graphql: {
    config: {
      server: {
        provider: 'apollo',
        version: 5, // or 4 (default when using legacy `apolloServer` only)
        options: {
          /* merged into ApolloServer, like legacy apolloServer */
        },
      },
    },
  },
};
```

If both `apolloServer` and `server` are set, `server` wins and Strapi logs a warning that `apolloServer` is ignored.

**Apollo v5** uses the same Koa middleware stack as v4. Ensure your app meets [Apollo Server 5 requirements](https://www.apollographql.com/docs/apollo-server/migration) (Node.js v20+, `graphql` ≥ 16.11.0). The `@as-integrations/koa` package is still typed for Apollo v4 but is compatible at runtime with Apollo v5.

Types for the `server` field (for TypeScript projects):

```ts
import type { GraphqlPluginServerConfig } from '@strapi/plugin-graphql/types/graphql-plugin-server';
```

Maintainers: see [`server/src/graphql-transport/EXTENDING.md`](./server/src/graphql-transport/EXTENDING.md) for adding new transports.
