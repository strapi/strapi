export const PLUGIN_ID = 'spaces';

/** Model uids owned by this plugin. */
export const SPACE_UID = 'plugin::spaces.space';
export const MEMBERSHIP_UID = 'plugin::spaces.space-membership';
export const TOKEN_BINDING_UID = 'plugin::spaces.token-space';

/**
 * Attribute injected onto every space-scoped model. `useJoinTable: false` makes
 * it a real `space_id` column on the model's own table, so the tenant filter is
 * an indexed column comparison rather than a join.
 */
export const SPACE_ATTRIBUTE = 'space';

/**
 * Header carrying the space the caller is acting in: a space slug, or `*` for
 * the cross-space view. Absent means "the caller's default space".
 */
export const SPACE_HEADER = 'x-strapi-space';

/** Value of {@link SPACE_HEADER} that asks for the cross-space view. */
export const GLOBAL_SPACE_HEADER_VALUE = '*';

/** Where the resolved scope lives on the Koa request state. */
export const SPACE_STATE_KEY = 'space';

/**
 * `pluginOptions.spaces.scoped` on a content type — `false` opts a content type
 * out of tenancy, making it shared, unscoped, platform-wide data.
 */
export const PLUGIN_OPTION = 'spaces';

/** The license feature that unlocks Spaces. */
export const LICENSE_FEATURE = 'cms-spaces';

/**
 * Enables Spaces on an EE instance whose license does not carry the feature
 * yet. Intended for development and for design partners ahead of the feature
 * being added to their plan; it does not bypass the EE licence check itself.
 */
export const ENABLE_ENV_VAR = 'STRAPI_FEATURE_SPACES';

export const ACTIONS = {
  /** Read the list of spaces and the space switcher. */
  read: 'plugin::spaces.spaces.read',
  /** Create, rename, archive spaces. */
  manage: 'plugin::spaces.spaces.manage',
  /** Add and remove members, assign their roles within a space. */
  manageMembers: 'plugin::spaces.members.manage',
  /** Act across every space at once (the `*` view) and reach unassigned data. */
  accessAll: 'plugin::spaces.spaces.access-all',
} as const;

export type SpaceStatus = 'active' | 'archived';

export interface Space {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string | null;
  status: SpaceStatus;
  isDefault: boolean;
  /**
   * `null` means every content type is available. An array restricts the space
   * to those uids.
   */
  contentTypes?: string[] | null;
}

export interface SpaceMembership {
  id: number;
  documentId: string;
  space: Space | number;
  user: { id: number } | number;
  /** Empty means "whatever roles the user holds platform-wide". */
  roles: Array<{ id: number }> | number[];
}

/** The space a unit of work runs in. */
export type SpaceScope =
  /** One space: only its rows are visible. */
  | { mode: 'space'; id: number; slug: string }
  /** Every space at once. Requires {@link ACTIONS.accessAll}. */
  | { mode: 'global' }
  /**
   * Outside any request — bootstrap, migrations, the CLI, a job that has not
   * declared its space. Trusted code, no filtering.
   */
  | { mode: 'unscoped' }
  /**
   * Inside a request that has no space: the caller belongs to none, or the
   * scope was never settled. Reading space-scoped data in this state is
   * refused — with `reason` if there is one to give — rather than silently
   * unfiltered. The request itself is allowed to continue, so that the admin
   * shell still loads and can explain the situation.
   */
  | { mode: 'unresolved'; reason?: string };
