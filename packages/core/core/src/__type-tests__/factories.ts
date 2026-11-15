/**
 * Type-level regression tests for the real `factories.createCoreController`, compiled by
 * `yarn test:ts` (tsc -p tsconfig.json) and excluded from the build. Each call must compile.
 */
import type { Context } from 'koa';
import { createCoreController } from '../factories';

// No content type is added to the registry here: a module augmentation would apply to the whole
// package program. The registered-type cases live in @strapi/types
// (src/core/__tests__/policy-controller.test.ts).

// A controller type passed explicitly, without the generic actions of `Extendable`.
type CustomController = { custom(ctx: Context): Promise<unknown> };

// No type arguments: custom actions call the base helpers,
// the core actions and any other action on `this`.
export const inferred = createCoreController('api::book.book', ({ strapi }) => ({
  async latest(ctx: Context) {
    strapi.log.info('latest');
    await this.find(ctx, async () => {});
    await this.other(ctx, async () => {});
    return this.transformResponse(await this.sanitizeOutput(await this.sanitizeQuery(ctx), ctx));
  },
}));

// No type arguments, object config.
export const inferredObject = createCoreController('api::book.book', {
  async latest(ctx: Context) {
    return this.transformResponse(await this.sanitizeQuery(ctx));
  },
});

// No config at all.
export const bare = createCoreController('api::book.book');

// Explicit type arguments: `this` exposes the core actions, the declared custom actions and
// any other action, as `Extendable` does.
export const explicit = createCoreController<'api::book.book', CustomController>(
  'api::book.book',
  () => ({
    async custom(ctx) {
      await this.find(ctx, async () => {});
      await this.other(ctx, async () => {});
      return this.transformResponse(await this.sanitizeQuery(ctx));
    },
  })
);
