import type { Modules } from '@strapi/types';

/**
 * Plain JSON Schema cached for `tools/list` only.
 *
 * Content-type and locale lists are captured when MCP tools are registered.
 * `strapi.reload()` replaces this process, so the process is the schema epoch.
 * Permission edits change the field and locale projection, which changes the
 * cache key. Eviction only causes a later miss.
 */
export const MCP_TOOL_JSON_SCHEMA_CACHE_MAX_BYTES = 32 * 1024 * 1024;

export const MCP_TOOL_JSON_SCHEMA_TARGET = 'draft-2020-12' as const;

export type McpToolSchemaProjection = Modules.MCP.McpToolSchemaProjection;

export type McpToolJsonSchemas = {
  input?: Record<string, unknown>;
  output: Record<string, unknown>;
};

type StoredToolJsonSchema = McpToolJsonSchemas & {
  bytes: number;
};

const EMPTY_PROJECTION: McpToolSchemaProjection = {
  fieldSets: [],
  localeSets: [],
};

export const mcpToolSchemaCacheKey = (name: string, projection: McpToolSchemaProjection): string =>
  JSON.stringify({
    name,
    fieldSets: projection.fieldSets.map((set) => [...set].sort()),
    localeSets: projection.localeSets.map((set) => [...set].sort()),
  });

export const readMcpToolSchemaProjection = (
  definition: Modules.MCP.McpToolDefinition,
  context: Modules.MCP.McpHandlerContext
): McpToolSchemaProjection => {
  if (typeof definition.resolveSchemaProjection !== 'function') {
    return EMPTY_PROJECTION;
  }

  return definition.resolveSchemaProjection(context);
};

const toPlainJson = (value: unknown): Record<string, unknown> => {
  const plain: unknown = JSON.parse(JSON.stringify(value));
  if (plain === null || typeof plain !== 'object' || Array.isArray(plain)) {
    throw new Error('[MCP] Tool JSON Schema must be an object');
  }

  return plain as Record<string, unknown>;
};

const toPlainSchemas = (schemas: McpToolJsonSchemas): McpToolJsonSchemas => ({
  input: schemas.input === undefined ? undefined : toPlainJson(schemas.input),
  output: toPlainJson(schemas.output),
});

const cloneSchemas = (schemas: McpToolJsonSchemas): McpToolJsonSchemas => ({
  input: schemas.input === undefined ? undefined : structuredClone(schemas.input),
  output: structuredClone(schemas.output),
});

const byteLengthOf = (schemas: McpToolJsonSchemas): number =>
  Buffer.byteLength(JSON.stringify(schemas), 'utf8');

/**
 * Standard Schema whose `~standard.jsonSchema` returns a copy of cached JSON.
 * The MCP SDK short-circuits conversion when `jsonSchema` is present, so a hit
 * does not call Zod or `toJSONSchema`. `validate` does not compile the stored
 * object; `tools/call` keeps a live Zod schema instead of this wrapper.
 */
export const cachedJsonSchemaStandardSchema = (json: Record<string, unknown>) => {
  const jsonSchema = () => structuredClone(json);

  return {
    '~standard': {
      version: 1 as const,
      vendor: 'strapi',
      jsonSchema: {
        input: jsonSchema,
        output: jsonSchema,
      },
      validate: () => ({
        issues: [{ message: 'Cached JSON Schema cannot validate a tools/call payload' }],
      }),
    },
  };
};

export class McpToolJsonSchemaCache {
  #maxBytes: number;

  #bytes = 0;

  #entries = new Map<string, StoredToolJsonSchema>();

  #inflight = new Map<string, Promise<McpToolJsonSchemas>>();

  #tail: Promise<void> = Promise.resolve();

  constructor(maxBytes = MCP_TOOL_JSON_SCHEMA_CACHE_MAX_BYTES) {
    this.#maxBytes = maxBytes;
  }

  get maxBytes(): number {
    return this.#maxBytes;
  }

  get size(): number {
    return this.#entries.size;
  }

  get byteLength(): number {
    return this.#bytes;
  }

  clear(): void {
    this.#entries.clear();
    this.#bytes = 0;
    this.#inflight.clear();
  }

  async getOrBuild(
    key: string,
    build: () => McpToolJsonSchemas | Promise<McpToolJsonSchemas>
  ): Promise<McpToolJsonSchemas> {
    const hit = this.#take(key);
    if (hit !== undefined) {
      return hit;
    }

    let flight = this.#inflight.get(key);
    if (flight === undefined) {
      flight = this.#enqueue(async () => {
        const warmed = this.#peek(key);
        if (warmed !== undefined) {
          return warmed;
        }

        const built = toPlainSchemas(await build());
        this.#store(key, built);
        return this.#peek(key) ?? built;
      });
      this.#inflight.set(key, flight);
      flight.then(
        () => {
          if (this.#inflight.get(key) === flight) {
            this.#inflight.delete(key);
          }
        },
        () => {
          if (this.#inflight.get(key) === flight) {
            this.#inflight.delete(key);
          }
        }
      );
    }

    const shared = await flight;
    return this.#take(key) ?? cloneSchemas(shared);
  }

  #enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.#tail.then(task, task);
    this.#tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  #peek(key: string): McpToolJsonSchemas | undefined {
    const entry = this.#entries.get(key);
    if (entry === undefined) {
      return undefined;
    }

    return { input: entry.input, output: entry.output };
  }

  #take(key: string): McpToolJsonSchemas | undefined {
    const entry = this.#entries.get(key);
    if (entry === undefined) {
      return undefined;
    }

    this.#entries.delete(key);
    this.#entries.set(key, entry);
    return cloneSchemas(entry);
  }

  #store(key: string, schemas: McpToolJsonSchemas): void {
    const bytes = byteLengthOf(schemas);
    if (bytes > this.#maxBytes) {
      return;
    }

    while (this.#bytes + bytes > this.#maxBytes && this.#entries.size > 0) {
      const oldest = this.#entries.keys().next().value;
      if (oldest === undefined) {
        break;
      }

      const evicted = this.#entries.get(oldest);
      this.#entries.delete(oldest);
      this.#bytes -= evicted?.bytes ?? 0;
    }

    const stored: StoredToolJsonSchema = { ...schemas, bytes };
    this.#entries.set(key, stored);
    this.#bytes += bytes;
  }
}

export const mcpToolSchemaCache = new McpToolJsonSchemaCache();
