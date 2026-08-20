import * as z from 'zod/v4';

const registry = z.registry<z.core.GlobalMeta>();
const schemas = new Map<string, z.ZodType>();

const set = (id: string, schema: z.ZodType): void => {
  const existingSchema = schemas.get(id);

  if (existingSchema !== undefined) {
    registry.remove(existingSchema);
    schemas.delete(id);
  }

  registry.add(schema, { id });
  schemas.set(id, schema);
};

const get = (id: string): z.ZodType | undefined => schemas.get(id);

const has = (id: string): boolean => schemas.has(id);

const remove = (id: string): boolean => {
  const schema = schemas.get(id);

  if (schema === undefined) {
    return false;
  }

  registry.remove(schema);
  return schemas.delete(id);
};

const clear = (): void => {
  registry.clear();
  schemas.clear();
};

const getRegistry = () => registry;

const entries = () => schemas.entries();

/**
 * Strapi-owned Zod registry and ID index for OpenAPI component schemas.
 *
 * Zod registries are keyed by schema instance and do not expose public ID enumeration,
 * so the adjacent Map is the source of truth for ID lookup and iteration.
 */
export const schemaRegistry = {
  set,
  get,
  has,
  remove,
  clear,
  getRegistry,
  entries,
};
