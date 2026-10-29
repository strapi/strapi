# strict-types

A Strapi application with `typescript.strictTypes` enabled (`config/typescript.ts`). Type generation
then registers the application's services and controllers, and `strapi.service(uid)` and
`strapi.controller(uid)` resolve to their registered types.

```bash
yarn build                       # at the repository root, once
yarn test:types:example          # at the repository root
yarn workspace strict-types run test:ts
```

`test:ts` runs `strapi ts:generate-types`, then `tsc` on the whole application.

## What each API shows

- `src/api/article`: a content type with a core service and a core controller. Each module exports
  its contract (`ServiceContract`, `ControllerContract`): the core type and a custom member.
  `satisfies Core.ServiceFactory<'api::article.article'>` and
  `satisfies Core.ControllerFactory<'api::article.article'>` check each factory against it. The
  `titles` action calls `strapi.service('api::article.article').findPublishedTitles()`, which the
  service contract declares.
- `src/api/stats`: a plain factory service and controller, without a content type, each with a
  contract.
- `src/api/legacy`: a service without a contract export. Type generation registers the type its
  factory returns, and `stats` uses it. It also lists the UID in
  `Strapi.Registries.InferredServices`, so `Core.ServiceFactory<'api::legacy.legacy'>` rejects it
  (TS2344): the check would read the type it defines.
  Two more services are edge cases kept on purpose to test type generation: `export-equals.ts`
  (`export =`) registers the type its factory returns, and `commonjs-style.ts` (`module.exports`
  in a `.ts` file, without `import` or `export`) registers `unknown` without an import, which would
  fail with TS2306.
- `src/policies/has-scope.js` and `src/middlewares/response-header.js`: edge cases kept on purpose
  to test type generation. A JS policy and a JS middleware whose config is typed with JSDoc. The
  tsconfig enables `allowJs`, so they compile into `dist`, which registers them, and type
  generation reads their config from the JSDoc. `checks/js-sources.ts` checks the registered
  configs and rejects a wrong config in a route reference.
- `checks/contracts.ts`: type checks for the lookups, and `@ts-expect-error` cases that fail without
  the contracts. If type generation stopped registering a contract, these directives would be unused
  and `tsc` would fail.

## Where contracts live

A module exports its contract as a type named `ServiceContract` or `ControllerContract`. To share a
contract between modules, write it in a file outside `services/` and `controllers/`, and re-export
it:

```ts
export type { ArticleContract as ServiceContract } from '../contracts';
```

The API loader registers every file in `services/` and `controllers/`: a `services/contract.ts`
would register an `api::article.contract` service.
