/**
 * What the role editor and the plugin's admin API share about permissions: the stored row, and the
 * layout the editor is drawn from. Imported with relative paths by the server and the plugin admin.
 */

import type { FieldAccepts } from '../builder/types';

/** The data actions of a content type, in the editor's column order. */
export const DATA_ACTIONS = [
  'find',
  'findOne',
  'create',
  'update',
  'delete',
  'read-drafts',
  'publish',
] as const;

export type DataAction = (typeof DATA_ACTIONS)[number];

/** The actions that have fields: one row per field. */
export const FIELD_ACTIONS: readonly DataAction[] = ['find', 'findOne', 'create', 'update'];

export type ConditionSource = 'builtin' | 'plugin' | 'code' | 'builder';

export interface ConditionRef {
  name: string;
  params?: Record<string, unknown>;
}

/** A role's permission as it is stored and as an export file carries it. */
export interface PermissionRow {
  action: string;
  subject: string | null;
  properties: {
    fields?: string[] | null;
    locales?: string[] | null;
    populateDepth?: number | null;
  };
  conditions: ConditionRef[];
}

export interface RolePermission extends PermissionRow {
  documentId: string;
}

/** `name` is the path ('seo.metaTitle'); `type` is the Strapi attribute type. */
export interface LayoutField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  engineOwned: boolean;
  /** `false` when a request can't write the field (a role never sets it); absent means writable */
  writable?: boolean;
  relationTarget?: string;
  children?: LayoutField[];
}

/** `actionId` is what is stored: 'api::article.article.find'. */
export interface LayoutAction {
  action: DataAction;
  actionId: string;
  hasRules: boolean;
}

export interface LayoutConditionParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'attribute';
  required: boolean;
  default?: unknown;
  options?: string[];
  /** The param only matters when an entry is created */
  createOnly?: boolean;
  /** For a builder `field` input: the kind of field it takes */
  accepts?: FieldAccepts;
}

export interface LayoutCondition {
  name: string;
  displayName: string;
  source: ConditionSource;
  params: LayoutConditionParam[];
}

export interface LayoutContentType {
  uid: string;
  label: string;
  kind: 'collectionType' | 'singleType';
  actions: LayoutAction[];
  fields: LayoutField[];
  locked: string[];
  conditions: LayoutCondition[];
}

/** `route` is 'GET /api/users/me'. */
export interface LayoutRoute {
  actionId: string;
  label: string;
  route: string;
  hasRules: boolean;
}

export interface LayoutRouteGroup {
  id: string;
  kind: 'plugin' | 'custom';
  label: string;
  categories: Array<{ label: string; routes: LayoutRoute[] }>;
}

export interface PermissionLayout {
  contentTypes: LayoutContentType[];
  groups: LayoutRouteGroup[];
}

export interface BoundRule {
  kind: 'policy' | 'middleware';
  name: string;
  label: string;
  /**
   * What the route gives the rule, as the server serves it: numbers, booleans, null and short
   * strings that do not look like a credential are shown; values under secret-like keys
   * (`apiKey`, `secret`, `token`, `url`...) and strings that are long or credential-shaped are
   * "[redacted]", what is not JSON is "[unserializable]", and a config that is not an object of
   * named settings is `{ value: "[redacted]" }`.
   */
  config: Record<string, unknown>;
}

export interface BoundRoute {
  actionId: string;
  method: string;
  path: string;
  rules: BoundRule[];
}
