import { createFieldCheck, createFieldVisitor } from '../../field-rules';
import type { FieldRuleOptions } from '../../sanitize/visitors/remove-unauthorized-fields';
import type { PermissionChecker } from '../../content-api-permissions';
import type { Visitor } from '../../traverse/factory';
import { throwInvalidKey } from '../utils';

/**
 * Refuses the keys the caller's field rules deny, with a `ValidationError` naming the key:
 * the counterpart of `removeUnauthorizedFields`, with the same arguments. `sanitize` drops them
 * where validation is not asked for.
 */
export default (
  checker: PermissionChecker,
  auth: unknown,
  action: string,
  { nodes = false, ...options }: FieldRuleOptions = {}
): Visitor =>
  createFieldVisitor(
    createFieldCheck({ checker, auth, action, ...options }),
    (denial) => {
      throwInvalidKey({ key: denial.key, path: denial.path });
    },
    { nodes, mutates: false }
  );
