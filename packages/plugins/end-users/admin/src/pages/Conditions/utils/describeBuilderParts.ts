import { createValueDescriber, sayWith } from './summarize';

import type { SummaryFormatter } from './summarize';
import type {
  BuilderValue,
  EntryCheck,
  FieldAccepts,
  StampRule,
  WhoCheck,
} from '../../../../../shared/builder/types';

/**
 * The parts of a builder condition as short phrases, one per check, for the read-only page. Values
 * and operators read as they do in the summary: they come from `summarize`. The phrases of the Who
 * checks and the stamps are messages `end-users.conditions.view.part.*` with their English default.
 */
export const createPartDescriber = (formatMessage: SummaryFormatter) => {
  const say = (id: string, defaultMessage: string, values?: Record<string, string | number>) =>
    formatMessage({ id: `end-users.conditions.view.part.${id}`, defaultMessage }, values);
  const { quote, describeValue, describeOperation } = createValueDescriber(sayWith(formatMessage));

  const describeCheckOperation = (operator: string, value: BuilderValue | undefined) =>
    `${describeOperation(operator, value)} ${
      operator === '$null' || operator === '$notNull' ? '' : describeValue(value)
    }`.trim();

  return {
    entryCheck: (check: EntryCheck) =>
      `${
        'path' in check.target
          ? check.target.path.join('.')
          : say('targetInput', 'the field chosen for {name}', { name: check.target.input })
      } ${describeCheckOperation(check.operator, check.value)}`,

    whoCheck: (check: WhoCheck) => {
      switch (check.kind) {
        case 'roles':
          return say(
            'whoRoles',
            '{match, select, none {Holds none of the roles {roles}} other {Holds any of the roles {roles}}}',
            { match: check.match, roles: check.roles.join(', ') }
          );
        case 'email-verified':
          return check.value
            ? say('whoEmailVerified', 'Has a verified email')
            : say('whoEmailNotVerified', 'Has an email that is not verified');
        default:
          return say(
            'whoAttribute',
            '{source, select, profile {Profile {attribute} {operation}} other {User {attribute} {operation}}}',
            {
              source: check.source,
              attribute: check.attribute,
              operation: describeCheckOperation(check.operator, check.value),
            }
          );
      }
    },

    stamp: ({ field, value }: StampRule) =>
      say('stamp', '{field} is set to {value}', {
        field,
        value:
          value.kind === 'user'
            ? say('valueSignedIn', 'the signed-in user')
            : value.kind === 'input'
              ? say('valueInput', 'the {name} input', { name: value.name })
              : quote(value.value),
      }),

    accepts: (accepts: FieldAccepts | undefined) =>
      accepts === undefined
        ? '—'
        : typeof accepts === 'string'
          ? accepts
          : say('acceptsRelation', 'relation to {target}', { target: accepts.relation }),
  };
};
