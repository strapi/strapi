import {
  PATTERN_OPERATORS,
  takesList,
  takesNoValue,
} from '../../../../../shared/builder/operators';
import { VALUE_KINDS } from '../../../../../shared/builder/values';

import { nextType } from './builderForm';

import type { FormFixed, FormInput, FormValue } from './builderForm';
import type { FilterableType } from '../../../../../shared/builder/operators';
import type { FieldAccepts } from '../../../../../shared/builder/types';
import type { BuilderAttribute, BuilderLayout } from '../../../../../shared/contracts/conditions';

export const USER_UID = 'plugin::end-users.user';

type ValueType = 'string' | 'number' | 'boolean';

/** What a value is compared with, as far as the value's control needs to know */
export interface ValueSlot {
  type: FilterableType;
  enum?: string[];
}

export interface PathOption {
  /** The path, dotted */
  value: string;
  path: string[];
  slot: ValueSlot;
}

export const isFilterable = (
  attribute: BuilderAttribute
): attribute is BuilderAttribute & { type: FilterableType } => attribute.type !== 'relation';

const slotOf = (attribute: BuilderAttribute & { type: FilterableType }): ValueSlot => ({
  type: attribute.type,
  ...(attribute.enum ? { enum: attribute.enum } : {}),
});

/** The attributes the entries a relation points at have: where a path goes next */
const attributesBehind = (layout: BuilderLayout, attribute: BuilderAttribute) =>
  attribute.relation ? nextType(layout, attribute.relation.target)?.attributes : undefined;

/**
 * The fields a Which check can be about: the fields the chosen types share, then the attributes of
 * what each relation points at, and the entry itself (`.documentId`) one relation further.
 */
export const pathOptions = (layout: BuilderLayout, fields: BuilderAttribute[]): PathOption[] => {
  const options: PathOption[] = [];

  for (const field of fields) {
    if (isFilterable(field)) {
      options.push({ value: field.name, path: [field.name], slot: slotOf(field) });

      continue;
    }

    options.push({
      value: `${field.name}.documentId`,
      path: [field.name, 'documentId'],
      slot: { type: 'string' },
    });

    for (const next of attributesBehind(layout, field) ?? []) {
      if (isFilterable(next)) {
        options.push({
          value: `${field.name}.${next.name}`,
          path: [field.name, next.name],
          slot: slotOf(next),
        });
      } else {
        options.push({
          value: `${field.name}.${next.name}.documentId`,
          path: [field.name, next.name, 'documentId'],
          slot: { type: 'string' },
        });
      }
    }
  }

  return options.filter(
    // `documentId` is offered once, even where an entry lists it as an attribute
    ({ value }, index, all) => all.findIndex((other) => other.value === value) === index
  );
};

/** What a path ends on, walked through the layout: any path, not only the offered ones */
export const slotOfPath = (
  layout: BuilderLayout,
  fields: BuilderAttribute[],
  path: string[]
): ValueSlot | undefined => {
  let attributes = fields;

  for (const [index, name] of path.entries()) {
    const attribute = attributes.find((candidate) => candidate.name === name);
    const last = index === path.length - 1;

    if (!attribute) {
      return last && name === 'documentId' ? { type: 'string' } : undefined;
    }

    if (last) {
      return isFilterable(attribute) ? slotOf(attribute) : undefined;
    }

    const behind = attributesBehind(layout, attribute);

    if (!behind) {
      return undefined;
    }

    attributes = behind;
  }

  return undefined;
};

/** A field input takes the kind of value its `accepts` says */
export const slotOfAccepts = (accepts: FieldAccepts | undefined): ValueSlot => {
  switch (accepts) {
    case 'number':
      return { type: 'float' };
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'date' };
    case 'text':
      return { type: 'string' };
    default:
      return { type: 'enumeration' };
  }
};

/** The kind of value a field takes with an operator: a pattern is a text, whatever the field */
export const valueTypeFor = (slot: ValueSlot, operator: string): ValueType =>
  PATTERN_OPERATORS.includes(operator) ? 'string' : VALUE_KINDS[slot.type];

/** The user attributes a value can name: `documentId` and the public ones of the right kind. A list is the roles. */
export const userValueOptions = (
  layout: BuilderLayout,
  wanted: ValueType,
  list: boolean
): string[] => {
  if (list) {
    return wanted === 'string' ? ['roles.documentId'] : [];
  }

  const named = layout.userAttributes
    .filter((attribute) => isFilterable(attribute) && VALUE_KINDS[attribute.type] === wanted)
    .map(({ name }) => name);

  return wanted === 'string'
    ? ['documentId', ...named.filter((name) => name !== 'documentId')]
    : named;
};

/** The profile attributes a value can name, and its to-one relations as `<name>.documentId` */
export const profileValueOptions = (
  layout: BuilderLayout,
  wanted: ValueType,
  list: boolean
): string[] => {
  if (list) {
    return [];
  }

  const named = layout.profileAttributes
    .filter((attribute) => isFilterable(attribute) && VALUE_KINDS[attribute.type] === wanted)
    .map(({ name }) => name);
  const relations =
    wanted === 'string'
      ? layout.profileAttributes
          .filter((attribute) => attribute.type === 'relation' && !attribute.relation?.toMany)
          .map(({ name }) => `${name}.documentId`)
      : [];

  return [...named, ...relations];
};

/** The inputs a value can name: text, number and boolean ones of the right kind */
export const inputValueOptions = (inputs: FormInput[], wanted: ValueType): FormInput[] =>
  inputs.filter(
    (input) =>
      input.name !== '' &&
      input.kind !== 'field' &&
      (input.kind === 'text' ? 'string' : input.kind) === wanted
  );

const FLAG: FormFixed = { kind: 'fixed', valueType: 'boolean', text: 'true' };

/** A value with nothing chosen yet, of the shape the operator takes */
export const emptyValue = (slot: ValueSlot, operator: string): FormValue => {
  if (takesNoValue(operator)) {
    return { ...FLAG };
  }

  const valueType = valueTypeFor(slot, operator);

  return takesList(operator)
    ? { kind: 'fixed', valueType, text: '', items: [] }
    : { kind: 'fixed', valueType, text: '' };
};

/** What is left of a value when its field or operator changed: the part that still fits, else an empty value */
export const reshapeValue = (
  value: FormValue | undefined,
  slot: ValueSlot,
  operator: string
): FormValue => {
  if (!value || takesNoValue(operator)) {
    return emptyValue(slot, operator);
  }

  const list = takesList(operator);

  if (value.kind !== 'fixed') {
    const keeps = list === (value.kind === 'user' && value.attribute === 'roles.documentId');

    return keeps ? value : emptyValue(slot, operator);
  }

  const wanted = valueTypeFor(slot, operator);
  const fits = (text: string) =>
    value.valueType === wanted && (!slot.enum || slot.enum.includes(text));

  if (list) {
    const items = (value.items ?? (value.text === '' ? [] : [value.text])).filter(fits);

    return { kind: 'fixed', valueType: wanted, text: '', items };
  }

  const text = value.items ? (value.items[0] ?? '') : value.text;

  return { kind: 'fixed', valueType: wanted, text: fits(text) ? text : '' };
};
