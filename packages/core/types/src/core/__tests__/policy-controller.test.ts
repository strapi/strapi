/**
 * Type-level regression tests, compiled by `yarn test:ts` (tsc -p tsconfig.json).
 * Each block mirrors a documented user pattern and must compile.
 */
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

// The policy context is the Koa context, so `state` (e.g. `state.auth`) is readable.
export const isAuthenticated: Core.PolicyHandler = (policyContext) => {
  return policyContext.state.auth !== undefined;
};

// The server awaits policy handlers, so async policies are allowed.
export const asyncPolicy: Core.PolicyHandler = async (policyContext) => {
  return policyContext.state.user !== undefined;
};

// Custom actions in a core controller factory call the base helpers on `this`.
export const bookController: Core.CoreAPI.Controller.FactoryConfig<'api::book.book'> = {
  async latest(ctx) {
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const sanitized = await this.sanitizeOutput(sanitizedQuery, ctx);
    return this.transformResponse(sanitized);
  },
};
