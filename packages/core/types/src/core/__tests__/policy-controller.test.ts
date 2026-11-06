/**
 * Type-level regression tests, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * Each block mirrors a documented user pattern and must compile; `@ts-expect-error` marks
 * the shapes that must keep failing.
 */
import type { Context } from 'koa';

import type { Core, Struct, UID } from '../..';

interface Book extends Struct.CollectionTypeSchema {
  collectionName: 'books';
  info: { singularName: 'book'; pluralName: 'books'; displayName: 'Book' };
  attributes: Record<string, never>;
}

declare module '../../public/registries' {
  export interface ContentTypeSchemas {
    'api::book.book': Book;
  }
}

// The policy context copies the Koa context's own properties, so `state.auth` is readable.
export const isAuthenticated: Core.PolicyHandler = (policyContext) => {
  return policyContext.state.auth !== undefined;
};

// The server awaits policy handlers, so async policies are allowed.
export const asyncPolicy: Core.PolicyHandler = async (policyContext) => {
  return policyContext.state.user !== undefined;
};

// The server treats `undefined` as a pass, so a policy that only throws on failure is allowed.
export const throwingPolicy: Core.PolicyHandler = (policyContext) => {
  if (policyContext.state.user === undefined) {
    throw new Error('Forbidden');
  }
};

// @ts-expect-error a policy must return a boolean or nothing, not any other value.
export const invalidPolicy: Core.PolicyHandler = () => 'allowed';

// Custom actions in a core controller factory call the base helpers on `this`.
export const bookController: Core.CoreAPI.Controller.FactoryConfig<'api::book.book'> = {
  async latest(ctx) {
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const sanitized = await this.sanitizeOutput(sanitizedQuery, ctx);
    return this.transformResponse(sanitized);
  },
};

// Mirrors `factories.createCoreController` (packages/core/core/src/factories.ts), which this
// package cannot import.
declare function createCoreController<
  TUID extends UID.ContentType,
  TController extends Core.CoreAPI.Controller.Extendable<TUID>,
>(
  uid: TUID,
  cfg?:
    | Core.CoreAPI.Controller.FactoryConfig<TUID, TController>
    | ((params: {
        strapi: Core.Strapi;
      }) => Core.CoreAPI.Controller.FactoryConfig<TUID, TController>)
): unknown;

// A controller type passed explicitly, without the generic actions of `Extendable`.
type CustomController = { custom(ctx: Context): Promise<unknown> };

// Explicit type arguments, registered collection type: `this` exposes the core actions,
// the declared custom actions and any other action, as `Extendable` does.
createCoreController<'api::book.book', CustomController>('api::book.book', () => ({
  async custom(ctx) {
    await this.find(ctx, async () => {});
    await this.other(ctx, async () => {});
    return this.transformResponse(await this.sanitizeQuery(ctx));
  },
}));

// Explicit type arguments, content type missing from the registry (no generated types):
// `this` still exposes the base helpers and any other action.
createCoreController<'api::unregistered.unregistered', CustomController>(
  'api::unregistered.unregistered',
  {
    async custom(ctx) {
      await this.find(ctx, async () => {});
      await this.other(ctx, async () => {});
      return this.transformResponse(await this.sanitizeQuery(ctx));
    },
  }
);
