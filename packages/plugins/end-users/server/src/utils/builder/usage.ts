import type { Modules } from '@strapi/types';

import { NEGATING_OPERATORS } from '../../../../shared/builder/operators';
import type {
  BuilderConditionV2,
  BuilderValue,
  EntryGroup,
  FieldAccepts,
} from '../../../../shared/builder/types';
import type { SelfWritableField } from '../../../../shared/contracts/conditions';
import type { RoleNamedBy } from '../../../../shared/contracts/roles';
import { CREATE_ONLY_PARAMS } from '../../conditions';
import { PROFILE_UID, USER_UID } from '../../constants';
import type { BuilderRecord } from './registry';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;

const inputOf = (value: BuilderValue | undefined): string[] =>
  value?.kind === 'input' ? [value.name] : [];

/** Every entry check of a group and the groups under it, with whether a `none` group holds it */
const entryChecks = (
  group: EntryGroup,
  inNone = false
): Array<{ check: Extract<EntryGroup['items'][number], { kind: 'check' }>; inNone: boolean }> =>
  group.items.flatMap((item) =>
    item.kind === 'group'
      ? entryChecks(item, inNone || group.match === 'none' || item.match === 'none')
      : [{ check: item, inNone: inNone || group.match === 'none' }]
  );

/** The inputs a Who check or an entry check reads, as a value or as the field it names */
export const inputsRead = (condition: BuilderConditionV2): Set<string> => {
  const read = new Set<string>();

  for (const check of condition.who.checks) {
    if (check.kind === 'attribute') {
      inputOf(check.value).forEach((name) => read.add(name));
    }
  }

  for (const { check } of entryChecks(condition.which)) {
    inputOf(check.value).forEach((name) => read.add(name));

    if ('input' in check.target) {
      read.add(check.target.input);
    }
  }

  return read;
};

/**
 * The inputs an entry check names as its field or its value under a negating operator or inside a
 * `none` group, which can't be a to-many relation (it would mean "some entry is not", not "none is")
 */
export const inputsNegated = (condition: BuilderConditionV2): Set<string> => {
  const negated = new Set<string>();

  for (const { check, inNone } of entryChecks(condition.which)) {
    if ('input' in check.target && (inNone || NEGATING_OPERATORS.includes(check.operator))) {
      negated.add(check.target.input);
    }
  }

  return negated;
};

/** The inputs only a stamp rule reads: they matter when an entry is created and at no other time */
export const createOnlyInputs = (condition: BuilderConditionV2): Set<string> => {
  const read = inputsRead(condition);

  return new Set(
    condition.onSave.stamp.flatMap((rule) =>
      rule.value.kind === 'input' && !read.has(rule.value.name) ? [rule.value.name] : []
    )
  );
};

/** The role names the Who checks use, once each */
export const rolesNamed = (condition: BuilderConditionV2): string[] => [
  ...new Set(condition.who.checks.flatMap((check) => (check.kind === 'roles' ? check.roles : []))),
];

export interface ParamExtras {
  createOnly?: boolean;
  accepts?: FieldAccepts;
}

/** What the role editor needs to know of each param of a condition beyond its declaration */
export const paramExtras = (
  definition: ContentApiConditionDefinition,
  builder: BuilderConditionV2 | undefined
): Map<string, ParamExtras> => {
  const extras = new Map<string, ParamExtras>();

  if (Object.prototype.hasOwnProperty.call(CREATE_ONLY_PARAMS, definition.name)) {
    for (const name of CREATE_ONLY_PARAMS[definition.name]) {
      extras.set(name, { createOnly: true });
    }
  }

  if (builder) {
    const createOnly = createOnlyInputs(builder);

    for (const input of builder.inputs) {
      const extra: ParamExtras = {};

      if (createOnly.has(input.name)) {
        extra.createOnly = true;
      }

      if (input.kind === 'field' && input.accepts !== undefined) {
        extra.accepts = input.accepts;
      }

      if (Object.keys(extra).length > 0) {
        extras.set(input.name, extra);
      }
    }
  }

  return extras;
};

/**
 * The builder conditions whose Who roles check names the role, with the check's `match`: `any` means
 * the role's users match, `none` that they are excluded. One entry per condition and match, in the
 * conditions' name order.
 */
export const conditionsNaming = (
  records: ReadonlyMap<string, BuilderRecord>,
  role: string
): RoleNamedBy[] =>
  [...records.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([name, { condition }]) =>
      (['any', 'none'] as const)
        .filter((match) =>
          condition.who.checks.some(
            (check) => check.kind === 'roles' && check.match === match && check.roles.includes(role)
          )
        )
        .map((match) => ({ name, displayName: condition.displayName, match }))
    );

/** Who a role's users are when Better Auth's own `/update-user` lets every signed-in user write a field */
export const EVERY_SIGNED_IN_USER = 'every signed-in user';

/**
 * The user attributes Better Auth's `/update-user` endpoint writes for the signed-in user: `name`
 * and `image`, the username plugin's `username` and `displayUsername`, and the plugin's own
 * `preferredLocale` (an `input` attribute). Nothing else of the user is writable there (`email` has
 * its own verified flow; the engine-owned fields are `input: false`).
 */
export const UPDATE_USER_FIELDS: readonly string[] = [
  'name',
  'image',
  'username',
  'displayUsername',
  'preferredLocale',
];

/** A Content API grant to write a type, as the permission rows give it: a role of signed-in users, its field list */
export interface WriteGrant {
  subject: string;
  /** null: every field */
  fields: string[] | null;
  role: string;
}

/** The attributes of the user and the profile that the Who checks and the values of a condition read */
const readsOf = (
  condition: BuilderConditionV2
): Array<{ source: 'user' | 'profile'; attribute: string }> => {
  const reads: Array<{ source: 'user' | 'profile'; attribute: string }> = [];

  const note = (value: BuilderValue | undefined) => {
    if (value?.kind === 'user' || value?.kind === 'profile') {
      reads.push({ source: value.kind, attribute: value.attribute });
    }
  };

  for (const check of condition.who.checks) {
    if (check.kind === 'attribute') {
      reads.push({ source: check.source, attribute: check.attribute });
      note(check.value);
    }
  }

  for (const { check } of entryChecks(condition.which)) {
    note(check.value);
  }

  return reads;
};

/** What no request writes: the user's id and roles, and the profile's `user` */
const NEVER_WRITTEN = new Set<string>(['documentId', 'roles', 'user']);

/**
 * Every user and profile field a condition reads that a request could write, as
 * `source.attribute` (`profile.plan`, `user.name`), once each in the order they are read. Never the
 * user's id, roles, or the profile's `user`. What the role editor checks a new grant against: a
 * grant that lets users write one of them lets them satisfy the condition themselves.
 */
export const readFieldsOf = (condition: BuilderConditionV2): string[] => [
  ...new Set(
    readsOf(condition)
      .filter(({ attribute }) => !NEVER_WRITTEN.has(attribute.split('.')[0]))
      .map(({ source, attribute }) => `${source}.${attribute}`)
  ),
];

/**
 * The fields a condition reads from the user or the profile that a signed-in user can write
 * themselves, so that the condition is only as trustworthy as who may write them. A profile field
 * counts when a role of signed-in users holds a `create` or `update` row on the profile type whose
 * field list is empty of a limit or names it; a user field when Better Auth's `/update-user` writes
 * it or a role holds such a row on the end-user type. Never the user's id, roles, or the profile's
 * `user`, which no request writes.
 */
export const selfWritableOf = (
  condition: BuilderConditionV2,
  grants: readonly WriteGrant[]
): SelfWritableField[] => {
  const found = new Map<string, SelfWritableField>();

  for (const { source, attribute } of readsOf(condition)) {
    const [head] = attribute.split('.');
    const field = `${source}.${attribute}`;

    if (found.has(field) || NEVER_WRITTEN.has(head)) {
      continue;
    }

    if (source === 'user' && UPDATE_USER_FIELDS.includes(head)) {
      found.set(field, { field, roles: [EVERY_SIGNED_IN_USER] });
      continue;
    }

    const roles = [
      ...new Set(
        grants
          .filter(
            ({ subject, fields }) =>
              subject === (source === 'user' ? USER_UID : PROFILE_UID) &&
              (fields === null || fields.some((f) => f === head || f.startsWith(`${head}.`)))
          )
          .map(({ role }) => role)
      ),
    ].sort((a, b) => a.localeCompare(b));

    if (roles.length > 0) {
      found.set(field, { field, roles });
    }
  }

  return [...found.values()];
};
