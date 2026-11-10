import {
  NEGATING_OPERATORS,
  PATTERN_OPERATORS,
  operatorsFor,
  takesList,
  takesNoValue,
} from '../../../../../shared/builder/operators';
import { BUILDER_LIMITS } from '../../../../../shared/builder/types';
import { VALUE_KINDS, valueProblem } from '../../../../../shared/builder/values';

import type { FilterableType } from '../../../../../shared/builder/operators';
import type {
  AppliesTo,
  BuilderConditionV2,
  BuilderInput,
  BuilderValue,
  EntryCheck,
  EntryGroup,
  FieldAccepts,
  FieldTarget,
  StampRule,
  WhoCheck,
} from '../../../../../shared/builder/types';
import type { BuilderAttribute, BuilderLayout } from '../../../../../shared/contracts/conditions';

type ValueType = 'string' | 'number' | 'boolean';

/** A fixed value as typed: its raw text (or one text per list item) and the kind it was written as */
export interface FormFixed {
  kind: 'fixed';
  valueType: ValueType;
  text: string;
  /** Present when the value is a list */
  items?: string[];
}

export type FormValue =
  | FormFixed
  | { kind: 'input'; name: string }
  | { kind: 'user'; attribute: string }
  | { kind: 'profile'; attribute: string }
  /** `amount` is the raw text of the offset; no `offset` means plain now */
  | { kind: 'now'; offset?: { amount: string; unit: 'minutes' | 'hours' | 'days' } };

export interface FormInput {
  key: string;
  name: string;
  kind: BuilderInput['kind'];
  accepts?: FieldAccepts;
  required: boolean;
  /** The raw text of the default; undefined for none */
  default?: string;
}

export type FormWhoCheck =
  | {
      key: string;
      kind: 'attribute';
      source: 'user' | 'profile';
      attribute: string;
      operator: string;
      value?: FormValue;
    }
  | { key: string; kind: 'roles'; match: 'any' | 'none'; roles: string[] }
  | { key: string; kind: 'email-verified'; value: boolean };

export interface FormCheck {
  key: string;
  kind: 'check';
  target: FieldTarget;
  operator: string;
  value?: FormValue;
}

export interface FormGroup {
  key: string;
  kind: 'group';
  match: 'all' | 'any' | 'none';
  items: Array<FormCheck | FormGroup>;
}

export interface FormStamp {
  key: string;
  field: string;
  value: { kind: 'user' } | { kind: 'input'; name: string } | FormFixed;
}

export interface BuilderForm {
  slug: string;
  displayName: string;
  appliesTo: AppliesTo;
  inputs: FormInput[];
  who: { match: 'all' | 'any'; checks: FormWhoCheck[] };
  which: FormGroup;
  onSave: { stamp: FormStamp[]; locked: string[] };
}

export interface FormProblem {
  /** Where in the form, dotted: `which.items.0.value` */
  path: string;
  message: string;
}

let keyCounter = 0;

/** A key for a new row, stable for the life of the page so React keeps the row's state */
export const newKey = (): string => {
  keyCounter += 1;

  return `row-${keyCounter}`;
};

const fixedToForm = (value: BuilderValueFixed): FormFixed => {
  const raw = value.value;

  if (Array.isArray(raw)) {
    return {
      kind: 'fixed',
      valueType:
        raw.length > 0 && raw.every((item) => typeof item === 'number') ? 'number' : 'string',
      text: '',
      items: raw.map(String),
    };
  }

  return { kind: 'fixed', valueType: typeof raw as ValueType, text: String(raw) };
};

type BuilderValueFixed = Extract<BuilderValue, { kind: 'fixed' }>;

const valueToForm = (value: BuilderValue): FormValue => {
  switch (value.kind) {
    case 'fixed':
      return fixedToForm(value);
    case 'now':
      return value.offset
        ? { kind: 'now', offset: { amount: String(value.offset.amount), unit: value.offset.unit } }
        : { kind: 'now' };
    default:
      return { ...value };
  }
};

const numberOf = (text: string): number => (text.trim() === '' ? NaN : Number(text));

/** The value the text stands for. A text that isn't of its kind is given back as it is, for `formProblems` to name */
const scalarOf = (valueType: ValueType, text: string): string | number | boolean => {
  if (valueType === 'number') {
    return numberOf(text);
  }

  if (valueType === 'boolean') {
    return text === 'true' ? true : text === 'false' ? false : text;
  }

  return text;
};

const fixedToValue = (value: FormFixed): BuilderValueFixed['value'] =>
  value.items
    ? value.items.map((item) => (value.valueType === 'number' ? numberOf(item) : item))
    : scalarOf(value.valueType, value.text);

const valueToCondition = (value: FormValue): BuilderValue => {
  switch (value.kind) {
    case 'fixed':
      return { kind: 'fixed', value: fixedToValue(value) };
    case 'now':
      return value.offset
        ? {
            kind: 'now',
            offset: { amount: numberOf(value.offset.amount), unit: value.offset.unit },
          }
        : { kind: 'now' };
    default:
      return { ...value };
  }
};

const withValue = <T extends { value?: FormValue }>(row: T) =>
  row.value === undefined ? {} : { value: valueToCondition(row.value) };

const groupToForm = (group: EntryGroup): FormGroup => ({
  key: newKey(),
  kind: 'group',
  match: group.match,
  items: group.items.map((item) =>
    item.kind === 'group'
      ? groupToForm(item)
      : {
          key: newKey(),
          kind: 'check',
          target: 'path' in item.target ? { path: [...item.target.path] } : { ...item.target },
          operator: item.operator,
          ...(item.value === undefined ? {} : { value: valueToForm(item.value) }),
        }
  ),
});

const groupToCondition = (group: FormGroup): EntryGroup => ({
  kind: 'group',
  match: group.match,
  items: group.items.map((item): EntryCheck | EntryGroup =>
    item.kind === 'group'
      ? groupToCondition(item)
      : {
          kind: 'check',
          target: 'path' in item.target ? { path: [...item.target.path] } : { ...item.target },
          operator: item.operator,
          ...withValue(item),
        }
  ),
});

const whoToForm = (check: WhoCheck): FormWhoCheck => {
  switch (check.kind) {
    case 'attribute':
      return {
        key: newKey(),
        kind: 'attribute',
        source: check.source,
        attribute: check.attribute,
        operator: check.operator,
        ...(check.value === undefined ? {} : { value: valueToForm(check.value) }),
      };
    case 'roles':
      return { key: newKey(), kind: 'roles', match: check.match, roles: [...check.roles] };
    default:
      return { key: newKey(), kind: 'email-verified', value: check.value };
  }
};

const whoToCondition = (check: FormWhoCheck): WhoCheck => {
  switch (check.kind) {
    case 'attribute':
      return {
        kind: 'attribute',
        source: check.source,
        attribute: check.attribute,
        operator: check.operator,
        ...withValue(check),
      };
    case 'roles':
      return { kind: 'roles', match: check.match, roles: [...check.roles] };
    default:
      return { kind: 'email-verified', value: check.value };
  }
};

const inputToForm = (input: BuilderInput): FormInput => ({
  key: newKey(),
  name: input.name,
  kind: input.kind,
  ...(input.accepts === undefined ? {} : { accepts: input.accepts }),
  // A field input is always required: unbound, the condition could never hold
  required: input.kind === 'field' || input.required,
  ...(input.default === undefined ? {} : { default: String(input.default) }),
});

const inputToCondition = (input: FormInput): BuilderInput => ({
  name: input.name,
  kind: input.kind,
  ...(input.accepts === undefined ? {} : { accepts: input.accepts }),
  required: input.kind === 'field' || input.required,
  ...(input.default === undefined
    ? {}
    : {
        default:
          input.kind === 'number'
            ? numberOf(input.default)
            : input.kind === 'boolean'
              ? input.default === 'true'
              : input.default,
      }),
});

const stampToForm = (rule: StampRule): FormStamp => ({
  key: newKey(),
  field: rule.field,
  value:
    rule.value.kind === 'fixed' ? fixedToForm(rule.value as BuilderValueFixed) : { ...rule.value },
});

const stampToCondition = (stamp: FormStamp): StampRule => ({
  field: stamp.field,
  value:
    stamp.value.kind === 'fixed'
      ? { kind: 'fixed', value: fixedToValue(stamp.value) as string | number | boolean }
      : { ...stamp.value },
});

/** The form of a condition, or of a new empty one: rows get keys and values become the text a person types */
export const toForm = (condition?: BuilderConditionV2): BuilderForm => {
  if (!condition) {
    return {
      slug: '',
      displayName: '',
      appliesTo: { kind: 'types', types: [] },
      inputs: [],
      who: { match: 'all', checks: [] },
      which: { key: newKey(), kind: 'group', match: 'all', items: [] },
      onSave: { stamp: [], locked: [] },
    };
  }

  return {
    slug: condition.slug,
    displayName: condition.displayName,
    appliesTo:
      condition.appliesTo.kind === 'types'
        ? { kind: 'types', types: [...condition.appliesTo.types] }
        : { ...condition.appliesTo },
    inputs: condition.inputs.map(inputToForm),
    who: { match: condition.who.match, checks: condition.who.checks.map(whoToForm) },
    which: groupToForm(condition.which),
    onSave: {
      stamp: condition.onSave.stamp.map(stampToForm),
      locked: [...condition.onSave.locked],
    },
  };
};

/** The file's condition: no keys, and each text turned into the kind it was written as. `formProblems` says what doesn't fit */
export const toCondition = (form: BuilderForm): BuilderConditionV2 => ({
  version: 2,
  slug: form.slug,
  displayName: form.displayName,
  appliesTo:
    form.appliesTo.kind === 'types'
      ? { kind: 'types', types: [...form.appliesTo.types] }
      : { ...form.appliesTo },
  inputs: form.inputs.map(inputToCondition),
  who: { match: form.who.match, checks: form.who.checks.map(whoToCondition) },
  which: groupToCondition(form.which),
  onSave: { stamp: form.onSave.stamp.map(stampToCondition), locked: [...form.onSave.locked] },
});

/** The content types a condition applies to: the same set the server works out */
export const typesOf = (
  layout: BuilderLayout,
  appliesTo: AppliesTo
): BuilderLayout['contentTypes'] => {
  switch (appliesTo.kind) {
    case 'all':
      return layout.contentTypes;
    case 'user-relation':
      return layout.contentTypes.filter(({ userRelations }) => userRelations.length > 0);
    default:
      return layout.contentTypes.filter(({ uid }) => appliesTo.types.includes(uid));
  }
};

const sameRelation = (a: BuilderAttribute, b: BuilderAttribute) =>
  a.relation?.target === b.relation?.target && a.relation?.toMany === b.relation?.toMany;

/**
 * What a condition can use on the chosen types: the attributes every one of them has with the same
 * type (an enumeration offers the values they share), and the relations they share to reach through.
 */
export const fieldsFor = (layout: BuilderLayout, appliesTo: AppliesTo): BuilderAttribute[] => {
  const [first, ...rest] = typesOf(layout, appliesTo);

  if (!first) {
    return [];
  }

  return first.attributes.flatMap((attribute) => {
    const others = rest.map(({ attributes }) =>
      attributes.find(({ name }) => name === attribute.name)
    );

    if (
      others.some(
        (other) =>
          !other ||
          other.type !== attribute.type ||
          (attribute.type === 'relation' && !sameRelation(attribute, other))
      )
    ) {
      return [];
    }

    if (attribute.type !== 'enumeration') {
      return [attribute];
    }

    const shared = (attribute.enum ?? []).filter((value) =>
      others.every((other) => !other?.enum || other.enum.includes(value))
    );

    return [{ ...attribute, enum: shared }];
  });
};

// ---- Problems -------------------------------------------------------------------------------

const USER_UID = 'plugin::end-users.user';
const PROFILE_UID = 'plugin::end-users.profile';

const SLUG = /^[a-z][a-z0-9-]{0,62}$/;
const RESERVED_SLUGS = new Set<string>(['new']);

const INPUT_NAME = /^[a-z][a-zA-Z0-9]{0,31}$/;

const KIND_TEXT: Record<ValueType, string> = {
  string: 'a text',
  number: 'a number',
  boolean: 'true or false',
};

/** What a value is compared with: the operators it takes, and what a value of it must be */
interface Slot {
  label: string;
  operators: readonly string[];
  kind: ValueType;
  dateLike: boolean;
  problem: (operator: string, value: unknown) => string | null;
}

const slotOfType = (
  label: string,
  type: FilterableType,
  enums: Array<readonly string[] | undefined> = [undefined]
): Slot => ({
  label,
  operators: operatorsFor(type),
  kind: VALUE_KINDS[type],
  dateLike: type === 'date' || type === 'datetime',
  problem(operator, value) {
    for (const values of enums) {
      const problem = valueProblem(type, operator, value, values);

      if (problem) {
        return problem;
      }
    }

    return null;
  },
});

const slotOfInput = (input: FormInput): Slot => {
  const label = `the ${input.name} input`;
  const { accepts } = input;

  if (accepts === 'date') {
    const date = slotOfType(label, 'date');
    const dateTime = slotOfType(label, 'datetime');

    return {
      ...date,
      problem: (operator, value) =>
        date.problem(operator, value) === null ? null : dateTime.problem(operator, value),
    };
  }

  if (accepts === 'number') {
    return slotOfType(label, 'float');
  }

  if (accepts === 'boolean') {
    return slotOfType(label, 'boolean');
  }

  return slotOfType(label, accepts === 'text' ? 'string' : 'enumeration');
};

const isFilterable = (
  attribute: BuilderAttribute
): attribute is BuilderAttribute & {
  type: FilterableType;
} => attribute.type !== 'relation';

interface Context {
  layout: BuilderLayout;
  types: BuilderLayout['contentTypes'];
  inputs: Map<string, FormInput>;
  problems: FormProblem[];
  checks: number;
}

const add = (ctx: Context, path: Array<string | number>, message: string) => {
  ctx.problems.push({ path: path.join('.'), message });
};

const countCheck = (ctx: Context, path: Array<string | number>) => {
  ctx.checks += 1;

  if (ctx.checks === BUILDER_LIMITS.checks + 1) {
    add(ctx, path, `A condition can hold at most ${BUILDER_LIMITS.checks} checks`);
  }
};

const inputKindOf = (input: FormInput): ValueType | undefined =>
  input.kind === 'field' ? undefined : input.kind === 'text' ? 'string' : input.kind;

/** What a `user` or `profile` value gives, or a message when it can't be a value */
const sourceValue = (
  ctx: Context,
  value: { kind: 'user' | 'profile'; attribute: string }
): { given: ValueType; several: boolean } | string => {
  const { attribute: name } = value;

  if (name === '') {
    return `${value.kind} needs an attribute`;
  }

  if (value.kind === 'user' && (name === 'documentId' || name === 'roles.documentId')) {
    return { given: 'string', several: name === 'roles.documentId' };
  }

  const where = value.kind === 'user' ? 'the end user' : 'the profile';
  const attributes =
    value.kind === 'user' ? ctx.layout.userAttributes : ctx.layout.profileAttributes;

  if (value.kind === 'profile' && name.endsWith('.documentId')) {
    const relation = name.slice(0, -'.documentId'.length);
    const found = attributes.find((attribute) => attribute.name === relation);

    return found?.type === 'relation' && !found.relation?.toMany
      ? { given: 'string', several: false }
      : `the profile: ${relation} is not a relation to one entry`;
  }

  const found = attributes.find((attribute) => attribute.name === name);

  if (!found) {
    return `${where}: there is no attribute ${name}`;
  }

  return isFilterable(found)
    ? { given: VALUE_KINDS[found.type], several: false }
    : `${where}: ${name} is a relation, not a value`;
};

const checkValueOf = (
  ctx: Context,
  slot: Slot,
  operator: string,
  value: FormValue | undefined,
  path: Array<string | number>
): void => {
  if (value === undefined) {
    return add(ctx, path, `${operator} needs a value`);
  }

  if (value.kind === 'fixed') {
    const problem = slot.problem(operator, fixedToValue(value));

    return problem ? add(ctx, [...path, 'value'], `${slot.label}: ${problem}`) : undefined;
  }

  const wanted: ValueType = PATTERN_OPERATORS.includes(operator) ? 'string' : slot.kind;

  if (takesNoValue(operator)) {
    return add(ctx, path, `${operator} takes true or false, written out`);
  }

  if (value.kind === 'now') {
    if (takesList(operator)) {
      return add(ctx, path, `${operator} takes a list of fixed values`);
    }

    if (!slot.dateLike || PATTERN_OPERATORS.includes(operator)) {
      add(ctx, path, `now is for date fields: ${slot.label} is not one`);
    }

    if (value.offset && !Number.isInteger(numberOf(value.offset.amount))) {
      add(ctx, [...path, 'offset', 'amount'], 'The offset amount is a whole number');
    }

    return undefined;
  }

  let given: ValueType;
  let several = false;

  if (value.kind === 'input') {
    const input = ctx.inputs.get(value.name);

    if (!input) {
      return add(ctx, path, `${value.name} is not an input of this condition`);
    }

    if (input.kind === 'field') {
      return add(ctx, path, `${input.name} is a field input: it stands for a field, not a value`);
    }

    given = inputKindOf(input) as ValueType;
  } else {
    const source = sourceValue(ctx, value);

    if (typeof source === 'string') {
      return add(ctx, path, source);
    }

    ({ given, several } = source);
  }

  if (several !== takesList(operator)) {
    return add(
      ctx,
      path,
      several
        ? 'roles.documentId is a list: it goes with is one of and is none of'
        : `${operator} takes a list of fixed values`
    );
  }

  if (given !== wanted) {
    return add(ctx, path, `${slot.label} takes ${KIND_TEXT[wanted]}, not ${KIND_TEXT[given]}`);
  }

  return undefined;
};

/** The operator and the value of one check, against what it is compared with */
const checkOperation = (
  ctx: Context,
  slot: Slot,
  row: { operator: string; value?: FormValue },
  path: Array<string | number>
): boolean => {
  if (!slot.operators.includes(row.operator)) {
    add(
      ctx,
      [...path, 'operator'],
      `${row.operator === '' ? 'No operator' : row.operator} is not offered for ${slot.label}: it takes ${slot.operators.join(', ')}`
    );

    return false;
  }

  checkValueOf(ctx, slot, row.operator, row.value, [...path, 'value']);

  return true;
};

/**
 * What a path reaches by a relation to `target`: a content type the layout lists, or, when it
 * doesn't list the end user or the profile, their own attributes (the server reads the real models)
 */
export const nextType = (
  layout: BuilderLayout,
  target: string
): { uid: string; attributes: BuilderAttribute[] } | undefined => {
  const listed = layout.contentTypes.find((type) => type.uid === target);

  if (listed) {
    return listed;
  }

  if (target === USER_UID) {
    return { uid: target, attributes: layout.userAttributes };
  }

  return target === PROFILE_UID ? { uid: target, attributes: layout.profileAttributes } : undefined;
};

interface Resolved {
  type: FilterableType;
  enums: Array<string[] | undefined>;
  toMany?: string;
}

const resolvePath = (
  ctx: Context,
  names: string[],
  at: Array<string | number>
): Resolved | undefined => {
  if (names.length === 0 || names.some((part) => part === '')) {
    add(ctx, at, 'A path is a list of field names, at least one');

    return undefined;
  }

  const dotted = names.join('.');

  if (names.length - 1 > BUILDER_LIMITS.relationHops) {
    add(
      ctx,
      at,
      `${dotted} goes through more than ${BUILDER_LIMITS.relationHops} relations, which is the most a path may`
    );

    return undefined;
  }

  const found: Array<{ uid: string; type: FilterableType; enumValues?: string[] }> = [];
  let toMany: string | undefined;

  for (const { uid } of ctx.types) {
    let { attributes } = ctx.layout.contentTypes.find((type) => type.uid === uid) ?? {
      attributes: [] as BuilderAttribute[],
    };
    let where = uid;

    for (const [index, name] of names.entries()) {
      const last = index === names.length - 1;
      const attribute = attributes.find((candidate) => candidate.name === name);

      if (last && name === 'documentId' && !attribute) {
        found.push({ uid, type: 'string' });
        break;
      }

      if (!attribute) {
        add(ctx, at, `${name} is not a field of ${where}`);

        return undefined;
      }

      if (last) {
        if (!isFilterable(attribute)) {
          add(
            ctx,
            at,
            `${dotted} ends on a relation: use ${dotted}.documentId to compare the entry`
          );

          return undefined;
        }

        found.push({ uid, type: attribute.type, enumValues: attribute.enum });
      } else {
        const target = attribute.relation?.target;
        const next = target ? nextType(ctx.layout, target) : undefined;

        if (attribute.type !== 'relation') {
          add(
            ctx,
            at,
            `${name} is a ${attribute.type} field of ${where}, not a relation: a path goes through relations only`
          );

          return undefined;
        }

        if (!next) {
          add(ctx, at, `${name} points to ${String(target)}, which a path can't go through`);

          return undefined;
        }

        if (attribute.relation?.toMany && toMany === undefined) {
          toMany = names.slice(0, index + 1).join('.');
        }

        attributes = next.attributes;
        where = next.uid;
      }
    }
  }

  const [first] = found;

  if (!first) {
    return undefined;
  }

  const other = found.find(({ type }) => type !== first.type);

  if (other) {
    add(
      ctx,
      at,
      `${dotted} is a ${first.type} on ${first.uid} but a ${other.type} on ${other.uid}: a condition can only filter on a field that has the same type on every content type it applies to`
    );

    return undefined;
  }

  return { type: first.type, enums: found.map(({ enumValues }) => enumValues), toMany };
};

const checkEntry = (
  ctx: Context,
  check: FormCheck,
  path: Array<string | number>,
  negated: boolean
): void => {
  countCheck(ctx, path);

  const targetPath = [...path, 'target'];
  let slot: Slot | undefined;
  let toMany: string | undefined;

  if ('input' in check.target) {
    const input = ctx.inputs.get(check.target.input);

    if (!input || input.kind !== 'field') {
      return add(
        ctx,
        [...targetPath, 'input'],
        `${check.target.input} is not a field input of this condition`
      );
    }

    slot = slotOfInput(input);
  } else {
    const resolved = resolvePath(ctx, check.target.path, [...targetPath, 'path']);

    if (resolved) {
      ({ toMany } = resolved);
      slot = slotOfType(check.target.path.join('.'), resolved.type, resolved.enums);
    }
  }

  if (!slot || !checkOperation(ctx, slot, check, path)) {
    return undefined;
  }

  if (toMany && (NEGATING_OPERATORS.includes(check.operator) || negated)) {
    add(
      ctx,
      [...path, NEGATING_OPERATORS.includes(check.operator) ? 'operator' : 'target'],
      `is not, does not include and none of can't cross the to-many relation ${toMany}`
    );
  }

  return undefined;
};

const checkGroup = (
  ctx: Context,
  group: FormGroup,
  path: Array<string | number>,
  depth: number,
  negated: boolean
): void => {
  const inside = negated || group.match === 'none';

  group.items.forEach((item, index) => {
    const at = [...path, 'items', index];

    if (item.kind === 'group') {
      if (depth >= BUILDER_LIMITS.nestedGroups) {
        add(ctx, at, `Groups nest ${BUILDER_LIMITS.nestedGroups} level deep at most`);
      } else {
        if (item.items.length === 0) {
          add(ctx, at, 'A group needs at least one check');
        }

        checkGroup(ctx, item, at, depth + 1, inside);
      }
    } else {
      checkEntry(ctx, item, at, inside);
    }
  });
};

const checkWho = (ctx: Context, form: BuilderForm): void => {
  form.who.checks.forEach((check, index) => {
    const path = ['who', 'checks', index];

    countCheck(ctx, path);

    if (check.kind === 'roles') {
      if (check.roles.length === 0 || check.roles.length > BUILDER_LIMITS.listValues) {
        add(
          ctx,
          [...path, 'roles'],
          `roles is a list of 1 to ${BUILDER_LIMITS.listValues} role names`
        );
      }

      for (const role of check.roles) {
        if (!ctx.layout.roles.includes(role)) {
          add(ctx, [...path, 'roles'], `${role} is not a role`);
        }
      }

      return;
    }

    if (check.kind === 'email-verified') {
      return;
    }

    const where = check.source === 'user' ? 'the end user' : 'the profile';
    const attributes =
      check.source === 'user' ? ctx.layout.userAttributes : ctx.layout.profileAttributes;
    const attribute = attributes.find(({ name }) => name === check.attribute);

    if (!attribute) {
      return add(ctx, [...path, 'attribute'], `${check.attribute} is not an attribute of ${where}`);
    }

    if (!isFilterable(attribute)) {
      return add(
        ctx,
        [...path, 'attribute'],
        `${check.attribute} is a relation attribute of ${where}, which a builder condition can't check`
      );
    }

    checkOperation(
      ctx,
      slotOfType(`${where}'s ${check.attribute}`, attribute.type, [attribute.enum]),
      check,
      path
    );

    return undefined;
  });
};

const checkInputs = (ctx: Context, form: BuilderForm): void => {
  if (form.inputs.length > BUILDER_LIMITS.inputs) {
    add(ctx, ['inputs'], `A condition can hold at most ${BUILDER_LIMITS.inputs} inputs`);
  }

  form.inputs.forEach((input, index) => {
    const path = ['inputs', index];

    if (!INPUT_NAME.test(input.name)) {
      add(
        ctx,
        [...path, 'name'],
        'An input name is letters and digits, starting with a lowercase letter, up to 32 characters'
      );
    } else if (ctx.inputs.has(input.name)) {
      add(ctx, [...path, 'name'], `There are two inputs named ${input.name}`);
    }

    ctx.inputs.set(input.name, input);

    if (input.kind === 'field') {
      if (input.accepts === undefined) {
        add(ctx, [...path, 'accepts'], `${input.name} is a field input: it needs accepts`);
      } else if (typeof input.accepts === 'object') {
        const { relation } = input.accepts;

        if (!ctx.layout.contentTypes.some(({ uid }) => uid === relation)) {
          add(
            ctx,
            [...path, 'accepts'],
            `${relation} is not a content type a role can be granted on`
          );
        }
      }

      return;
    }

    if (input.default === undefined) {
      return;
    }

    const wanted = inputKindOf(input) as ValueType;
    const given = scalarOf(wanted, input.default);
    const fits = wanted === 'number' ? Number.isFinite(given) : typeof given === wanted;

    if (!fits) {
      add(ctx, [...path, 'default'], `The default of ${input.name} is ${KIND_TEXT[wanted]}`);
    } else if (wanted === 'string') {
      const problem = valueProblem('string', '$eq', input.default);

      if (problem) {
        add(ctx, [...path, 'default'], `The default of ${input.name}: ${problem}`);
      }
    }
  });
};

/** What a field is on every chosen type, for a stamp */
const stampKind = (
  ctx: Context,
  field: string,
  path: Array<string | number>
):
  | { kind: FilterableType | 'user' | 'relation'; enums: Array<string[] | undefined> }
  | undefined => {
  const kinds: Array<{
    uid: string;
    kind: FilterableType | 'user' | 'relation';
    enumValues?: string[];
  }> = [];

  for (const { uid, attributes } of ctx.types) {
    const attribute = attributes.find(({ name }) => name === field);

    if (!attribute) {
      add(ctx, path, `${field} is not a field of ${uid}`);

      return undefined;
    }

    if (attribute.type === 'relation') {
      kinds.push({ uid, kind: attribute.relation?.target === USER_UID ? 'user' : 'relation' });
    } else {
      kinds.push({ uid, kind: attribute.type, enumValues: attribute.enum });
    }
  }

  const [first] = kinds;
  const other = kinds.find(({ kind }) => kind !== first?.kind);

  if (!first) {
    return undefined;
  }

  if (other) {
    add(
      ctx,
      path,
      `${field} is a ${first.kind} on ${first.uid} but a ${other.kind} on ${other.uid}: a stamp needs the same type on every content type`
    );

    return undefined;
  }

  return { kind: first.kind, enums: kinds.map(({ enumValues }) => enumValues) };
};

const checkOnSave = (ctx: Context, form: BuilderForm): void => {
  const seen = new Set<string>();

  form.onSave.stamp.forEach((rule, index) => {
    const path = ['onSave', 'stamp', index];

    if (rule.field === '') {
      return add(ctx, [...path, 'field'], 'field is the name of a field');
    }

    if (seen.has(rule.field)) {
      add(ctx, [...path, 'field'], `${rule.field} is stamped twice`);
    }

    seen.add(rule.field);

    const found = stampKind(ctx, rule.field, [...path, 'field']);

    if (!found) {
      return undefined;
    }

    const { kind, enums } = found;
    const valuePath = [...path, 'value'];

    if (rule.value.kind === 'user') {
      return kind === 'user'
        ? undefined
        : add(
            ctx,
            valuePath,
            `${rule.field} is not a relation to the end user, so it can't be stamped with the user`
          );
    }

    if (kind === 'user' || kind === 'relation') {
      return add(
        ctx,
        valuePath,
        `${rule.field} is a relation: only the user can be stamped on a relation to the end user`
      );
    }

    if (rule.value.kind === 'input') {
      const input = ctx.inputs.get(rule.value.name);
      const given = input ? inputKindOf(input) : undefined;

      if (!given) {
        return add(
          ctx,
          valuePath,
          `${rule.value.name} is not a text, number or boolean input of this condition`
        );
      }

      return given === VALUE_KINDS[kind]
        ? undefined
        : add(
            ctx,
            valuePath,
            `${rule.field} takes ${KIND_TEXT[VALUE_KINDS[kind]]}, not ${KIND_TEXT[given]}`
          );
    }

    const problem = slotOfType(rule.field, kind, enums).problem('$eq', fixedToValue(rule.value));

    return problem ? add(ctx, [...valuePath, 'value'], `${rule.field}: ${problem}`) : undefined;
  });

  const offered = new Set(fieldsFor(ctx.layout, form.appliesTo).map(({ name }) => name));

  form.onSave.locked.forEach((name, index) => {
    if (!offered.has(name)) {
      add(
        ctx,
        ['onSave', 'locked', index],
        `${name} is not a field every chosen content type has, so it can't be locked`
      );
    }
  });
};

const checkAppliesTo = (ctx: Context, form: BuilderForm): void => {
  const at = ['appliesTo'];
  const { appliesTo } = form;

  if (appliesTo.kind === 'user-relation' && ctx.types.length === 0) {
    add(ctx, at, 'No content type has a relation to the end user');
  }

  if (appliesTo.kind === 'types') {
    if (appliesTo.types.length === 0) {
      add(ctx, [...at, 'types'], 'types is a list of content types, at least one');
    }

    for (const uid of appliesTo.types) {
      if (!ctx.layout.contentTypes.some((type) => type.uid === uid)) {
        add(ctx, [...at, 'types'], `${uid} is not a content type a role can be granted on`);
      }
    }
  }
};

export const isReservedSlug = (slug: string): boolean => RESERVED_SLUGS.has(slug);

/**
 * What is wrong with the form, as the server would refuse it, for the refusals the admin can know
 * from the layout: the slug and name, what it applies to, the inputs, the Who checks, the Which
 * groups (paths on every type, operators and values of the field's type, no negation across a
 * to-many relation, the limits) and the stamps. The server checks the whole condition again on
 * every write; it also checks that a locked field exists, which the layout can't show for fields
 * the builder doesn't offer, so that isn't checked here.
 */
export const formProblems = (form: BuilderForm, layout: BuilderLayout): FormProblem[] => {
  const ctx: Context = {
    layout,
    types: typesOf(layout, form.appliesTo),
    inputs: new Map(),
    problems: [],
    checks: 0,
  };

  const slug = form.slug.trim();

  if (!SLUG.test(slug)) {
    add(
      ctx,
      ['slug'],
      'The slug is lowercase letters, digits and hyphens, starting with a letter, up to 63 characters'
    );
  } else if (RESERVED_SLUGS.has(slug)) {
    add(
      ctx,
      ['slug'],
      `The slug "${slug}" is reserved: it is the address of the builder's page for a new condition`
    );
  }

  if (form.displayName.trim() === '') {
    add(ctx, ['displayName'], 'displayName is the condition’s name, as a text');
  }

  checkAppliesTo(ctx, form);
  checkInputs(ctx, form);
  checkWho(ctx, form);
  checkGroup(ctx, form.which, ['which'], 0, false);
  checkOnSave(ctx, form);

  return ctx.problems;
};
