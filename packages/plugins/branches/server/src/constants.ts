export const PLUGIN_ID = 'branches';

export const BRANCH_MODEL_UID = 'plugin::branches.branch';
export const CHANGE_MODEL_UID = 'plugin::branches.change';

/** Request header carrying the active branch slug. Absent (or `main`) = main. */
export const BRANCH_HEADER = 'X-Strapi-Branch';

/** The virtual trunk: no row, no `branch_id`. */
export const MAIN_SLUG = 'main';

/**
 * How many levels of relation hydration may re-enter the branching middleware
 * (a branch-edited article populating a branch-edited author populating…).
 * Beyond this depth targets are read as-is.
 */
export const MAX_OVERLAY_DEPTH = 3;
