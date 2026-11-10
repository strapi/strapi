import { getTranslation } from '../../../utils/getTranslation';

import type {
  BuilderConditionV2,
  BuilderValue,
  EntryCheck,
  EntryGroup,
  FieldTarget,
  StampRule,
  WhoCheck,
} from '../../../../../shared/builder/types';
import type { BuilderLayout } from '../../../../../shared/contracts/conditions';
import type { MessageDescriptor } from 'react-intl';

export type SummaryFormatter = (
  descriptor: MessageDescriptor,
  values?: Record<string, string | number>
) => string;

const OPERATORS: Record<string, string> = {
  $eq: 'eq',
  $ne: 'ne',
  $lt: 'lt',
  $lte: 'lte',
  $gt: 'gt',
  $gte: 'gte',
  $contains: 'contains',
  $notContains: 'notContains',
  $containsi: 'containsi',
  $notContainsi: 'notContainsi',
  $startsWith: 'startsWith',
  $endsWith: 'endsWith',
  $in: 'in',
  $notIn: 'notIn',
};

const list = (items: string[], type: 'conjunction' | 'disjunction' = 'conjunction') =>
  new Intl.ListFormat(undefined, { style: 'long', type }).format(items);

const countChecks = (group: EntryGroup): number =>
  group.items.reduce((sum, item) => sum + (item.kind === 'group' ? countChecks(item) : 1), 0);

type Say = (id: string, defaultMessage: string, values?: Record<string, string | number>) => string;

/** Says a message `end-users.conditions.summary.<id>` with its English default */
export const sayWith =
  (formatMessage: SummaryFormatter): Say =>
  (id, defaultMessage, values) =>
    formatMessage({ id: getTranslation(`conditions.summary.${id}`), defaultMessage }, values);

/** The wording of values and operators, shared by the summary and the read-only page */
export const createValueDescriber = (say: Say) => {
  const quote = (value: string | number | boolean) =>
    typeof value === 'string' ? `'${value}'` : String(value);

  const describeValue = (value: BuilderValue | undefined): string => {
    if (!value) {
      return '';
    }

    switch (value.kind) {
      case 'fixed':
        return Array.isArray(value.value) ? value.value.map(quote).join(', ') : quote(value.value);
      case 'input':
        return say('valueInput', 'the {name} input', { name: value.name });
      case 'user':
        return value.attribute === 'documentId'
          ? say('valueUser', 'the signed-in user')
          : say('valueUserAttribute', "the signed-in user''s {attribute}", {
              attribute: value.attribute,
            });
      case 'profile':
        return say('valueProfile', "the signed-in user''s profile {attribute}", {
          attribute: value.attribute,
        });
      default: {
        if (!value.offset || value.offset.amount === 0) {
          return say('valueNow', 'now');
        }

        return say(
          'valueNowOffset',
          '{direction, select, minus {now minus {amount} {unit}} other {now plus {amount} {unit}}}',
          {
            direction: value.offset.amount < 0 ? 'minus' : 'plus',
            amount: Math.abs(value.offset.amount),
            unit: value.offset.unit,
          }
        );
      }
    }
  };

  const describeOperation = (operator: string, value: BuilderValue | undefined): string => {
    if (operator === '$null' || operator === '$notNull') {
      const flag = value?.kind === 'fixed' ? value.value === true : true;

      return (operator === '$null') === flag
        ? say('isEmpty', 'is empty')
        : say('isNotEmpty', 'is not empty');
    }

    const key = OPERATORS[operator];

    return say(
      'operator',
      '{operator, select, eq {is} ne {is not} lt {is less than} lte {is at most} gt {is more than} gte {is at least} contains {contains} notContains {does not contain} containsi {contains, ignoring case,} notContainsi {does not contain, ignoring case,} startsWith {starts with} endsWith {ends with} in {is one of} notIn {is none of} other {{raw}}}',
      { operator: key ?? 'other', raw: operator }
    );
  };

  return { quote, describeValue, describeOperation };
};

/**
 * One plain-English sentence per part of the condition, for the builder's preview and the read-only
 * page. Each sentence is a message `end-users.conditions.summary.*` with its English default.
 */
export const summarize = (
  condition: BuilderConditionV2,
  layout: BuilderLayout,
  formatMessage: SummaryFormatter
): string[] => {
  const say = sayWith(formatMessage);
  const { quote, describeValue, describeOperation } = createValueDescriber(say);

  const describeTarget = (target: FieldTarget): string =>
    'path' in target
      ? target.path.join('.')
      : say('targetInput', 'the field chosen for {name}', { name: target.input });

  const describeCheck = (check: EntryCheck): string =>
    `${describeTarget(check.target)} ${describeOperation(check.operator, check.value)} ${
      check.operator === '$null' || check.operator === '$notNull' ? '' : describeValue(check.value)
    }`.trim();

  const describeGroup = (group: EntryGroup): string => {
    const parts = group.items.map((item) =>
      item.kind === 'group' ? describeGroup(item) : describeCheck(item)
    );

    return say(
      'group',
      '{match, select, any {any of: {items}} none {none of: {items}} other {all of: {items}}}',
      { match: group.match, items: parts.join('; ') }
    );
  };

  const describeWho = (check: WhoCheck): string => {
    switch (check.kind) {
      case 'roles':
        return say(
          'whoRoles',
          '{match, select, none {hold none of {roles}} other {hold {count, plural, one {{roles}} other {any of {roles}}}}}',
          { match: check.match, count: check.roles.length, roles: list(check.roles) }
        );
      case 'email-verified':
        return check.value
          ? say('whoEmailVerified', 'have a verified email')
          : say('whoEmailNotVerified', 'have an email that is not verified');
      default:
        return say(
          'whoAttribute',
          '{source, select, profile {have a profile with {attribute} {operation}} other {have {attribute} {operation}}}',
          {
            source: check.source,
            attribute: check.attribute,
            operation: `${describeOperation(check.operator, check.value)} ${
              check.operator === '$null' || check.operator === '$notNull'
                ? ''
                : describeValue(check.value)
            }`.trim(),
          }
        );
    }
  };

  const describeStamp = ({ field, value }: StampRule): string => {
    const what =
      value.kind === 'user'
        ? say('valueUser', 'the signed-in user')
        : value.kind === 'input'
          ? say('valueInput', 'the {name} input', { name: value.name })
          : quote(value.value);

    return say('stampOne', '{field} to {value}', { field, value: what });
  };

  const sentences: string[] = [];
  const { appliesTo } = condition;

  if (appliesTo.kind === 'all') {
    sentences.push(say('appliesAll', 'Applies to every content type.'));
  } else if (appliesTo.kind === 'user-relation') {
    sentences.push(
      say(
        'appliesUserRelation',
        'Applies to every content type that has a relation to the end user.'
      )
    );
  } else {
    const names = appliesTo.types.map(
      (uid) => layout.contentTypes.find((type) => type.uid === uid)?.displayName ?? uid
    );

    sentences.push(say('appliesTypes', 'Applies to {types}.', { types: list(names) }));
  }

  if (condition.inputs.length > 0) {
    sentences.push(
      say('inputs', 'A role gives {names} when it uses this condition.', {
        names: list(condition.inputs.map(({ name }) => name)),
      })
    );
  }

  if (condition.who.checks.length > 0) {
    sentences.push(
      say('who', 'Only for users who {checks}.', {
        checks: list(
          condition.who.checks.map(describeWho),
          condition.who.match === 'any' ? 'disjunction' : 'conjunction'
        ),
      })
    );
  }

  if (countChecks(condition.which) === 0) {
    sentences.push(say('restrictsNothing', 'Restricts nothing.'));
  } else {
    const { which } = condition;
    const parts = which.items.map((item) =>
      item.kind === 'group' ? describeGroup(item) : describeCheck(item)
    );
    const joined =
      which.match === 'all'
        ? list(parts)
        : say('groupRoot', '{match, select, none {none of: {items}} other {any of: {items}}}', {
            match: which.match,
            items: parts.join('; '),
          });

    sentences.push(say('keeps', 'Keeps entries where {checks}.', { checks: joined }));
  }

  if (condition.onSave.stamp.length > 0) {
    sentences.push(
      say('stamps', 'On create, sets {stamps}.', {
        stamps: list(condition.onSave.stamp.map(describeStamp)),
      })
    );
  }

  if (condition.onSave.locked.length > 0) {
    sentences.push(
      say('locked', '{fields} cannot be changed after create.', {
        fields: list(condition.onSave.locked),
      })
    );
  }

  return sentences;
};
