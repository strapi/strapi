/**
 * First-party plumbing, not public API. `globals-admin` stays on its own subpath
 * because it is a side-effecting global augmentation.
 */
export type * as Admin from './admin';
