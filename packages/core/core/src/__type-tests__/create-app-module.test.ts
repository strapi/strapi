/**
 * Type-level regression tests for `factories.createAppModule`, compiled by `yarn test:ts`
 * (tsc -p tsconfig.json) and excluded from the build. Each block must compile; `@ts-expect-error`
 * marks the modules that must keep failing.
 */
import type { Core } from '@strapi/types';

import { createAppModule } from '../factories';

type Assert<T extends true> = T;
type IsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2 ? true : false;

// The template: `{ strapi }` is typed without annotation in every lifecycle.
export const app = createAppModule({
  register({ strapi }) {
    true satisfies Assert<IsEqual<typeof strapi, Core.Strapi>>;
  },
  async bootstrap({ strapi }) {
    true satisfies Assert<IsEqual<typeof strapi, Core.Strapi>>;
    strapi.log.info('bootstrapped');
  },
  async destroy({ strapi }) {
    true satisfies Assert<IsEqual<typeof strapi, Core.Strapi>>;
  },
});

true satisfies Assert<IsEqual<typeof app, Core.AppModule>>;

// Every lifecycle is optional, and a lifecycle may answer a value: Strapi awaits and drops it.
export const emptyApp = createAppModule({});
export const valueApp = createAppModule({
  register: ({ strapi }) => strapi.config.get('server.host'),
});

// Entries written before the helper keep compiling: an explicit annotation, or no parameter.
export const annotatedApp = createAppModule({
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.log.info('registered');
  },
  bootstrap() {},
});

// A plain object needs no helper: it is the same module.
export const plainApp = {
  register() {},
  bootstrap() {},
} satisfies Core.AppModule;

createAppModule(plainApp);

createAppModule({
  // @ts-expect-error `src/index` only has `register`, `bootstrap` and `destroy`: startup fails on other keys.
  routes: [],
});

createAppModule({
  // @ts-expect-error a lifecycle is a function.
  bootstrap: true,
});

createAppModule({
  // @ts-expect-error a lifecycle receives `{ strapi }`, not the instance itself.
  register(strapi: Core.Strapi) {
    strapi.log.info('registered');
  },
});

createAppModule({
  register() {},
  bootstrap({ strapi }) {
    // @ts-expect-error Strapi calls each lifecycle detached from the module: `this` is undefined.
    this.register?.({ strapi });
  },
});
