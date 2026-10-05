import type { Core } from '@strapi/types';
import * as z from 'zod/v4';

/**
 * Builds a Map-backed content-API schema store for OpenAPI tests.
 * Does not import `@strapi/core`.
 */
export const createTestContentAPISchemaRegistry = (): Core.ContentAPISchemaRegistry => {
  const schemas = new Map<string, z.ZodType>();
  const pending = new Set<string>();

  const get = (id: string) => schemas.get(id);

  return {
    set(id, schema) {
      schemas.set(id, schema);
    },
    get,
    getOrDefer(id) {
      if (pending.has(id) === true) {
        return z.lazy(() => {
          const schema = get(id);
          if (schema === undefined) {
            throw new Error(`Content-API schema "${id}" was not registered`);
          }
          return schema;
        });
      }
      return get(id);
    },
    has(id) {
      return schemas.has(id);
    },
    startPending(id) {
      pending.add(id);
    },
    finishPending(id) {
      pending.delete(id);
    },
    entries() {
      return schemas.entries();
    },
  };
};
