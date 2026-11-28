import { isOwner } from './is-owner';
import { isSelf } from './is-self';

export { isOwner, ownerField, relationsTo, relationsToUser } from './is-owner';
export { isSelf } from './is-self';

/** The plugin's own Content API conditions, in the order `register()` registers them. */
export const BUILT_IN_CONDITIONS = [isSelf, isOwner] as const;

/**
 * The params of a built-in condition that only matter when an entry is created, by condition name:
 * the role editor's modal shows them on the Create row only.
 */
export const CREATE_ONLY_PARAMS: Readonly<Record<string, readonly string[]>> = {
  'plugin::end-users.is-owner': ['setOnCreate'],
};
