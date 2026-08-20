import type { z } from 'zod';

/**
 * Per-application store of named Zod schemas built for content-API validation.
 *
 * The ID map is the source of truth for lookup and iteration. OpenAPI conversion
 * copies `entries()` into a conversion-local registry and must not receive a live
 * Zod registry.
 *
 * @internal Owned by the Strapi instance that created the schemas. Not a plugin API.
 */
export type ContentAPISchemaRegistry = {
  set(id: string, schema: z.ZodType): void;
  get(id: string): z.ZodType | undefined;
  /**
   * Returns the registered schema, or a lazy stand-in when construction of `id`
   * is still in progress (cycle breaking).
   */
  getOrDefer(id: string): z.ZodType | undefined;
  has(id: string): boolean;
  startPending(id: string): void;
  finishPending(id: string): void;
  entries(): Iterable<[string, z.ZodType]>;
};
