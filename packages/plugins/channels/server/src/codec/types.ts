// Copied from packages/plugins/branches/server/src/codec/types.ts — keep structurally
// in sync; extraction into a shared package is planned once both plugins are merged.
/** Logical reference to a related document (row ids never enter a snapshot). */
export interface RelRef {
  documentId: string;
  locale: string | null;
}

/** Reference to a Media Library file. */
export interface MediaRef {
  id: number | string;
}

/**
 * Canonical value format stored in `strapi_branch_changes.changes` / `.base`:
 * top-level attribute → value. Scalars as-is, media as `MediaRef`, relations
 * as ordered `RelRef` lists (single/null for toOne), components as nested
 * objects keeping their `id`, dynamic zones as component arrays with `__component`.
 */
export type Snapshot = Record<string, unknown>;

/** What a caller asked to populate for one attribute (original param form kept for nesting). */
export interface PopulateSpec {
  count?: boolean;
  fields?: string[];
  populate?: unknown;
  on?: Record<string, PopulateSpec>;
}

export interface PopulateMap {
  /** `populate: '*'` / `true` at this level: every populatable attribute is requested. */
  all: boolean;
  entries: Map<string, PopulateSpec>;
}

export interface LooseSchema {
  uid: string;
  modelType?: string;
  attributes: Record<string, LooseAttribute>;
  pluginOptions?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface LooseAttribute {
  type: string;
  relation?: string;
  target?: string;
  useJoinTable?: boolean;
  multiple?: boolean;
  repeatable?: boolean;
  component?: string;
  components?: string[];
  private?: boolean;
  visible?: boolean;
  writable?: boolean;
  [key: string]: unknown;
}
