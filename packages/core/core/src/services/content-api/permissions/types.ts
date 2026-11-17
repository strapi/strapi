import type { Modules } from '@strapi/types';

/*
 * The types are declared in `@strapi/types`, which plugins and `@strapi/utils` can import and
 * `@strapi/core` cannot be imported by; they are re-exported here for core's own code.
 */
export type ContentApiPermission = Modules.ContentAPI.ContentApiPermission;
export type ConditionUser = Modules.ContentAPI.ConditionUser;
export type MaterializedPermission = Modules.ContentAPI.MaterializedPermission;
export type CompiledPermissions = Modules.ContentAPI.CompiledPermissions;
export type ContentApiAbility = Modules.ContentAPI.ContentApiAbility;

/**
 * The key under which an ability built by `generateAbility` carries its data rules. Defined in
 * `@strapi/utils` (a registered symbol), where plugins read it too.
 */
export { DATA_ABILITY } from '@strapi/utils';

/**
 * Actions no controller method backs, registered for every content type with draft & publish:
 * reading drafts and publishing are data rules, not routes.
 */
export const SYNTHETIC_ACTIONS = ['read-drafts', 'publish'] as const;

export type SyntheticAction = (typeof SYNTHETIC_ACTIONS)[number];

/**
 * The synthetic action of a single type: its first document is created by the `update` route, so
 * `create` is a data rule no controller backs (who may create it, and the owner it is stamped with)
 */
export const SINGLE_TYPE_CREATE = 'create';
