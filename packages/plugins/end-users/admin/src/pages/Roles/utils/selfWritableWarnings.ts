import type { ConditionListItem } from '../../../../../shared/contracts/conditions';
import type { PermissionRow } from '../../../../../shared/contracts/permissions';

const USER_UID = 'plugin::end-users.user';
const PROFILE_UID = 'plugin::end-users.profile';

/** The user fields Better Auth's own `/update-user` already lets every signed-in user write */
const UPDATE_USER_FIELDS = new Set<string>([
  'name',
  'image',
  'username',
  'displayUsername',
  'preferredLocale',
]);

/** A grant of a role that would let users write a field a builder condition reads */
export interface SelfWritableWarning {
  /** The condition's name and what it is called */
  condition: string;
  displayName: string;
  /** As the condition reads it: `profile.plan`, `user.age` */
  field: string;
}

/** Whether the rows let a request write `head`, a field of `uid`: a `create` or an `update` that names it, or has no field list */
const writes = (rows: readonly PermissionRow[], uid: string, head: string): boolean =>
  rows.some(({ action, properties }) => {
    if (action !== `${uid}.create` && action !== `${uid}.update`) {
      return false;
    }

    const fields = properties.fields;

    // No list is every field; an empty one is none
    return !fields || fields.some((name) => name === head || name.startsWith(`${head}.`));
  });

/**
 * The builder conditions that read a user or profile field the role's new rows let users write and
 * its stored rows did not: whoever holds the role could then satisfy the condition themselves.
 * Only what the save adds is listed, so a grant already in place is not asked about again.
 */
const findSelfWritableWarnings = (
  conditions: readonly ConditionListItem[],
  before: readonly PermissionRow[],
  after: readonly PermissionRow[]
): SelfWritableWarning[] =>
  conditions.flatMap(({ name, displayName, reads = [] }) =>
    reads
      .filter((field) => {
        const [source, ...path] = field.split('.');
        const head = path[0];

        if (head === undefined) {
          return false;
        }

        if (source === 'user' && UPDATE_USER_FIELDS.has(head)) {
          // Everyone can write these already: no grant of this role changes that
          return false;
        }

        const uid = source === 'user' ? USER_UID : PROFILE_UID;

        return writes(after, uid, head) && !writes(before, uid, head);
      })
      .map((field) => ({ condition: name, displayName, field }))
  );

export { findSelfWritableWarnings };
