import type { Schema, UID } from '@strapi/types';

/**
 * Typed attribute builders (`is.*`) exposed via `@strapi/strapi/attributes`.
 *
 * Each builder is a thin factory that returns a plain attribute schema object
 * (e.g. `is.string({ required: true })` → `{ type: 'string', required: true }`).
 * Option/return types are derived from `@strapi/types`
 * (`packages/core/types/src/schema/attribute/**`) so the builders stay in
 * lock-step with the canonical schema types.
 */

type Options<T extends Schema.Attribute.Attribute> = Omit<T, 'type'>;

export const string = (opts?: Options<Schema.Attribute.String>): Schema.Attribute.String => ({
  type: 'string',
  ...opts,
});

export const text = (opts?: Options<Schema.Attribute.Text>): Schema.Attribute.Text => ({
  type: 'text',
  ...opts,
});

export const richtext = (opts?: Options<Schema.Attribute.RichText>): Schema.Attribute.RichText => ({
  type: 'richtext',
  ...opts,
});

export const blocks = (opts?: Options<Schema.Attribute.Blocks>): Schema.Attribute.Blocks => ({
  type: 'blocks',
  ...opts,
});

export const email = (opts?: Options<Schema.Attribute.Email>): Schema.Attribute.Email => ({
  type: 'email',
  ...opts,
});

export const password = (opts?: Options<Schema.Attribute.Password>): Schema.Attribute.Password => ({
  type: 'password',
  ...opts,
});

export const integer = (opts?: Options<Schema.Attribute.Integer>): Schema.Attribute.Integer => ({
  type: 'integer',
  ...opts,
});

export const biginteger = (
  opts?: Options<Schema.Attribute.BigInteger>
): Schema.Attribute.BigInteger => ({
  type: 'biginteger',
  ...opts,
});

export const float = (opts?: Options<Schema.Attribute.Float>): Schema.Attribute.Float => ({
  type: 'float',
  ...opts,
});

export const decimal = (opts?: Options<Schema.Attribute.Decimal>): Schema.Attribute.Decimal => ({
  type: 'decimal',
  ...opts,
});

export const boolean = (opts?: Options<Schema.Attribute.Boolean>): Schema.Attribute.Boolean => ({
  type: 'boolean',
  ...opts,
});

export const date = (opts?: Options<Schema.Attribute.Date>): Schema.Attribute.Date => ({
  type: 'date',
  ...opts,
});

export const time = (opts?: Options<Schema.Attribute.Time>): Schema.Attribute.Time => ({
  type: 'time',
  ...opts,
});

export const datetime = (opts?: Options<Schema.Attribute.DateTime>): Schema.Attribute.DateTime => ({
  type: 'datetime',
  ...opts,
});

export const timestamp = (
  opts?: Options<Schema.Attribute.Timestamp>
): Schema.Attribute.Timestamp => ({
  type: 'timestamp',
  ...opts,
});

export const json = (opts?: Options<Schema.Attribute.JSON>): Schema.Attribute.JSON => ({
  type: 'json',
  ...opts,
});

export const enumeration = <const TValues extends string[]>(
  opts: Options<Schema.Attribute.Enumeration<TValues>>
): Schema.Attribute.Enumeration<TValues> => ({
  type: 'enumeration',
  ...opts,
});

export const uid = (opts?: Options<Schema.Attribute.UID>): Schema.Attribute.UID => ({
  type: 'uid',
  ...opts,
});

export const media = <
  TKind extends Schema.Attribute.MediaKind | undefined = undefined,
  TMultiple extends boolean = false,
>(
  opts?: Options<Schema.Attribute.Media<TKind, TMultiple>>
): Schema.Attribute.Media<TKind, TMultiple> =>
  ({
    type: 'media',
    ...opts,
  }) as Schema.Attribute.Media<TKind, TMultiple>;

export const component = <
  TComponentUID extends UID.Component = UID.Component,
  TRepeatable extends boolean = false,
>(
  opts: Options<Schema.Attribute.Component<TComponentUID, TRepeatable>>
): Schema.Attribute.Component<TComponentUID, TRepeatable> =>
  ({
    type: 'component',
    ...opts,
  }) as Schema.Attribute.Component<TComponentUID, TRepeatable>;

/**
 * Relation attribute builder.
 *
 * Bidirectional and x-way relations require a `target`; morph-owner relations
 * (`morphToOne` / `morphToMany`) do not. The overloads model both shapes.
 */
export function relation<
  TKind extends Schema.Attribute.RelationKind.WithTarget,
  TTarget extends UID.ContentType = UID.ContentType,
>(
  opts: { relation: TKind } & Options<Schema.Attribute.Relation<TKind, TTarget>>
): Schema.Attribute.Relation<TKind, TTarget>;
export function relation<TKind extends Schema.Attribute.RelationKind.WithoutTarget>(
  opts: { relation: TKind } & Options<Schema.Attribute.Relation<TKind>>
): Schema.Attribute.Relation<TKind>;
export function relation(opts: { relation: string } & Record<string, unknown>) {
  return {
    type: 'relation',
    ...opts,
  } as unknown as Schema.Attribute.Relation;
}
