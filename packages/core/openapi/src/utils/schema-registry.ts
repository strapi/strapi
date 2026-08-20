import * as z from 'zod/v4';

/**
 * Shared across CJS/ESM copies of this package. Zod uses the same pattern for
 * `z.globalRegistry` (`globalThis.__zod_globalRegistry`). A module-level
 * singleton is empty when `@strapi/core` registers schemas via `require()` and
 * the CLI generates the document via `import`.
 */
export const SCHEMA_REGISTRY_GLOBAL_KEY = '__strapi_openapiSchemaRegistry';

type SchemaRegistryStore = {
  registry: ReturnType<typeof z.registry<z.core.GlobalMeta>>;
  schemas: Map<string, z.ZodType>;
  pending: Set<string>;
};

type GlobalWithSchemaRegistry = typeof globalThis & {
  [SCHEMA_REGISTRY_GLOBAL_KEY]?: SchemaRegistryStore;
};

const getStore = (): SchemaRegistryStore => {
  const globalObject: GlobalWithSchemaRegistry = globalThis;
  const existing = globalObject[SCHEMA_REGISTRY_GLOBAL_KEY];

  if (existing !== undefined) {
    return existing;
  }

  const created: SchemaRegistryStore = {
    registry: z.registry<z.core.GlobalMeta>(),
    schemas: new Map<string, z.ZodType>(),
    pending: new Set<string>(),
  };
  globalObject[SCHEMA_REGISTRY_GLOBAL_KEY] = created;

  return created;
};

const set = (id: string, schema: z.ZodType): void => {
  const { registry, schemas } = getStore();
  const existingSchema = schemas.get(id);

  if (existingSchema !== undefined) {
    registry.remove(existingSchema);
    schemas.delete(id);
  }

  registry.add(schema, { id });
  schemas.set(id, schema);
};

const get = (id: string): z.ZodType | undefined => getStore().schemas.get(id);

const has = (id: string): boolean => getStore().schemas.has(id);

const getRequired = (id: string): z.ZodType => {
  const schema = get(id);

  if (schema === undefined) {
    throw new Error(`OpenAPI schema "${id}" was not registered`);
  }

  return schema;
};

const startPending = (id: string): void => {
  getStore().pending.add(id);
};

const finishPending = (id: string): void => {
  getStore().pending.delete(id);
};

const isPending = (id: string): boolean => getStore().pending.has(id);

const getOrDefer = (id: string): z.ZodType | undefined => {
  if (isPending(id) === true) {
    return z.lazy(() => getRequired(id));
  }

  return get(id);
};

const remove = (id: string): boolean => {
  const { registry, schemas } = getStore();
  const schema = schemas.get(id);

  if (schema === undefined) {
    return false;
  }

  registry.remove(schema);
  return schemas.delete(id);
};

const clear = (): void => {
  const { registry, schemas, pending } = getStore();
  registry.clear();
  schemas.clear();
  pending.clear();
};

const getRegistry = () => getStore().registry;

const entries = () => getStore().schemas.entries();

/**
 * Strapi-owned Zod registry and ID index for OpenAPI component schemas.
 *
 * Zod registries are keyed by schema instance and do not expose public ID enumeration,
 * so the adjacent Map is the source of truth for ID lookup and iteration.
 */
export const schemaRegistry = {
  set,
  get,
  getOrDefer,
  has,
  remove,
  clear,
  startPending,
  finishPending,
  isPending,
  getRegistry,
  entries,
};
