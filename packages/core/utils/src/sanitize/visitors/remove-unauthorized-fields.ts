import { createFieldCheck, createFieldVisitor } from '../../field-rules';
import type { FieldCheckOptions } from '../../field-rules';
import type { PermissionChecker } from '../../content-api-permissions';
import type { Visitor } from '../../traverse/factory';

/** What a field-rule visitor reads besides the caller and the action */
export type FieldRuleOptions = Pick<
  FieldCheckOptions,
  'entries' | 'creates' | 'matched' | 'stampKeys'
> & {
  /** The traversal is a populate: also walk the `filters` and `sort` of each of its nodes */
  nodes?: boolean;
};

/**
 * Removes the keys the caller's field rules deny. `action` is the rule action of the root of
 * the traversal: `create` or `update` for the input of a write (the keys of the create stamp stay),
 * a read action for an output (with `entries`, the fields of each entry) or a query (the fields every
 * entry has in common). A relation's target reads by its own `find` fields.
 *
 * Make one for each traversal. A removed key is recorded as `field-removed`; which roles hold the
 * action is the checker's to say, so `roles` is empty here, as for the conditions.
 *
 * @experimental Public for now, shared with `@strapi/plugin-end-users`. May change in a minor release.
 */
export default (
  checker: PermissionChecker,
  auth: unknown,
  action: string,
  { nodes = false, ...options }: FieldRuleOptions = {}
): Visitor =>
  createFieldVisitor(
    createFieldCheck({ checker, auth, action, ...options }),
    (denial, key, { remove }) => {
      checker.record(auth, {
        kind: 'field-removed',
        uid: denial.uid,
        action: denial.action,
        path: denial.field,
        roles: [],
      });

      remove(key);
    },
    { nodes, mutates: true }
  );
