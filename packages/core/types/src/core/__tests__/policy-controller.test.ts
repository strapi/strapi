/**
 * Type-level regression tests, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * Each block mirrors a documented user pattern and must compile; `@ts-expect-error` marks
 * the shapes that must keep failing.
 */
import type { ExtendableContext } from 'koa';

import type { Core, Struct } from '../..';

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

// The policy context copies the Koa context's own properties, so `state.auth` is readable
// when the context has a `state` (REST); other callers may omit it.
export const isAuthenticated: Core.PolicyHandler = (policyContext) => {
  return policyContext.state?.auth !== undefined;
};

// The server awaits policy handlers, so async policies are allowed.
export const asyncPolicy: Core.PolicyHandler = async (policyContext) => {
  return policyContext.state?.user !== undefined;
};

// The server treats `undefined` as a pass, so a policy that only throws on failure is allowed.
export const throwingPolicy: Core.PolicyHandler = (policyContext) => {
  if (policyContext.state?.user === undefined) {
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

// A plain Koa `ExtendableContext` (what `PolicyContext` is built from) can be passed to a policy.
declare const koaContext: ExtendableContext;
isAuthenticated({ ...koaContext, type: 'koa', is: () => false }, undefined, {
  strapi: {} as Core.Strapi,
});
