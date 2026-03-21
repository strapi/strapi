# Extending GraphQL transports

The GraphQL plugin selects an HTTP implementation through:

1. **`resolveGraphqlServerConfig`** ([`config/resolve-graphql-server-config.ts`](../config/resolve-graphql-server-config.ts)) — normalizes legacy `apolloServer` and optional `graphql.config.server`.
2. **`mountGraphqlTransport`** ([`registry.ts`](./registry.ts)) — dispatches to a concrete `mount*` implementation.

To add a new engine:

1. Add a branch in `resolveGraphqlServerConfig` for the new `server.provider` value and return a `ResolvedGraphqlTransport` variant (extend the union in [`types.ts`](./types.ts)).
2. Add `case` in `mountGraphqlTransport` with `import()` of a new module (e.g. `./my-engine/mount.ts`).
3. Implement `mountX(ctx)` returning `{ destroy }`, registering routes via `strapi.server.routes` and respecting auth/body middleware behavior consistent with other transports.
4. Add unit tests for the resolver and integration tests for the route.

Apollo v4 lives in [`apollo/apollo-v4.ts`](./apollo/apollo-v4.ts) (imports `@apollo/server`). Apollo v5 is implemented in [`apollo/apollo-v5.ts`](./apollo/apollo-v5.ts) (imports `@apollo/server-v5`, a second install via npm alias).
