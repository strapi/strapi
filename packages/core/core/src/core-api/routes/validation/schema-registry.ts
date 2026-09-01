import * as z from 'zod/v4';

type SchemaRegistryStore = {
  registry: ReturnType<typeof z.registry<z.core.GlobalMeta>>;
  schemas: Map<string, z.ZodType>;
  pending: Set<string>;
};

/**
 * Creates a per-application store of named Zod schemas for content-API validation.
 *
 * An owned Zod registry is kept in sync with the ID map so schema identity is
 * preserved during construction. The map is the source of truth for lookup and
 * iteration; OpenAPI conversion must copy `entries()` into a conversion-local
 * registry rather than reading the live Zod registry.
 */
export const createContentAPISchemaRegistry = () => {
  const store: SchemaRegistryStore = {
    registry: z.registry<z.core.GlobalMeta>(),
    schemas: new Map<string, z.ZodType>(),
    pending: new Set<string>(),
  };

  const get = (id: string): z.ZodType | undefined => store.schemas.get(id);

  const getRequired = (id: string): z.ZodType => {
    const schema = get(id);

    if (schema === undefined) {
      throw new Error(`Content-API schema "${id}" was not registered`);
    }

    return schema;
  };

  const isPending = (id: string): boolean => store.pending.has(id);

  const set = (id: string, schema: z.ZodType): void => {
    const existingSchema = store.schemas.get(id);

    if (existingSchema !== undefined) {
      store.registry.remove(existingSchema);
      store.schemas.delete(id);
    }

    store.registry.add(schema, { id });
    store.schemas.set(id, schema);
  };

  const has = (id: string): boolean => store.schemas.has(id);

  const getOrDefer = (id: string): z.ZodType | undefined => {
    if (isPending(id) === true) {
      return z.lazy(() => getRequired(id));
    }

    return get(id);
  };

  const startPending = (id: string): void => {
    store.pending.add(id);
  };

  const finishPending = (id: string): void => {
    store.pending.delete(id);
  };

  const entries = (): Iterable<[string, z.ZodType]> => store.schemas.entries();

  const remove = (id: string): boolean => {
    const schema = store.schemas.get(id);

    if (schema === undefined) {
      return false;
    }

    store.registry.remove(schema);
    return store.schemas.delete(id);
  };

  const clear = (): void => {
    store.registry.clear();
    store.schemas.clear();
    store.pending.clear();
  };

  return {
    set,
    get,
    getOrDefer,
    has,
    startPending,
    finishPending,
    entries,
    remove,
    clear,
  };
};
