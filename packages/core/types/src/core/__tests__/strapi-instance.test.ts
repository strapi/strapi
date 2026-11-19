import type { LifecycleMethod } from '../../plugin/config/strapi-server/lifecycle';
import type { AppModule, Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

// `strapi.app` is the application's `src/index` module (`loaders/src-index.ts` in `@strapi/core`),
// not the Koa application (`strapi.server.app`). Without strict types it stays `any`
// (`tests/strict-off/instance.ts`).
declare const appChecks: [
  Expect<Equal<StrapiInstance['app'], AppModule | undefined>>,
  Expect<
    Equal<
      AppModule,
      { register?: LifecycleMethod; bootstrap?: LifecycleMethod; destroy?: LifecycleMethod }
    >
  >,
];
appChecks satisfies unknown;

declare const strapi: StrapiInstance;

// The lifecycles are optional, and the module is missing before loading and after `destroy`.
const register: LifecycleMethod | undefined = strapi.app?.register;
register satisfies unknown;
// @ts-expect-error `strapi.app` is `undefined` before loading, without `src`, and after `destroy`.
strapi.app.bootstrap satisfies unknown;
// @ts-expect-error `src/index` only has `register`, `bootstrap` and `destroy`.
strapi.app?.routes satisfies unknown;
