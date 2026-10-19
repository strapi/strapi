/**
 * Write inputs of the Document Service with strict types: the `data` that `create`, `update` and
 * `clone` accept, computed from the schema modifiers type generation already emits
 * (`Schema.Attribute.Required`, `Schema.Attribute.DefaultTo`).
 *
 * The rules mirror the entity validator. It runs in one of two modes:
 * - draft mode, for the draft rows of a draft and publish content type: `required` is skipped,
 *   except on repeatable components and dynamic zones;
 * - publishing mode, for every write without draft and publish, and for the publish step.
 *
 * And in one of two passes: `create` checks that required keys are present (`notNil`), `update`
 * only rejects `null` on them (`notNull`).
 *
 * | Attribute                                | Key required                         | `null` accepted |
 * | ---------------------------------------- | ------------------------------------ | --------------- |
 * | optional                                 | no                                   | yes, except arrays |
 * | `required` with a literal default        | no                                   | draft mode only |
 * | `required` repeatable component, DZ      | on every create, drafts included     | never           |
 * | `required` relation or media             | no                                   | yes             |
 * | other `required`                         | on create in publishing mode         | draft mode only |
 * | any attribute, on update                 | no                                   | as above        |
 *
 * Runtime references below are relative to `packages/core/core/src/services/`.
 *
 * Out of scope: rules that depend on stored data (a publish that fails because the stored draft
 * misses a value), value constraints (`min`, `max`, `regex`), and `writable: false` attributes,
 * which type generation does not emit.
 */
import type * as Schema from '../../../schema';
import type * as UID from '../../../uid';
import type { Simplify } from '../../../utils';

import type { IsDraftAndPublishEnabled } from '../draft-and-publish';
import type { ID, DocumentID, GetValue } from './attributes';
import type { Input } from './data';

/** A publication status, as passed in the `status` param. */
export type Status = 'draft' | 'published';

/** A write operation, as the entity validator tells them apart (`creation` or `update`). */
export type Operation = 'create' | 'update';

/**
 * The validator mode of a write with `TStatus` on `TContentTypeUID`.
 *
 * The validator runs in draft mode when the data has no `publishedAt`
 * (`document-service/entries.ts:94`). Without draft and publish, every write sets `publishedAt`
 * (`document-service/draft-and-publish.ts:90-91`), so every write is a publishing write. With draft
 * and publish, `create` and `update` write the draft in draft mode; `status: 'published'` then
 * publishes it, and the publish step validates the stored draft in publishing mode. A published
 * write must therefore carry what publishing requires.
 */
export type WriteMode<TContentTypeUID extends UID.ContentType, TStatus extends Status> =
  IsDraftAndPublishEnabled<TContentTypeUID> extends true ? TStatus : 'published';

/**
 * Repeatable components and dynamic zones are arrays: their validator is always built with
 * `required: true`, drafts included (`entity-validator/index.ts:169-172`, `:224-227`). An optional
 * one defaults to `[]` on create (`:121-125`); a required one has no default, so its key must be
 * present on every create, and `[]` is enough. The array validator rejects `null` in both passes.
 */
type IsArrayKind<TAttribute> = TAttribute extends { type: 'dynamiczone' }
  ? true
  : TAttribute extends Schema.Attribute.Component<UID.Component, infer TRepeatable>
    ? [TRepeatable] extends [true]
      ? true
      : false
    : false;

/**
 * `required` on relations and media is enforced only with `api.documents.strictRelations` on, and
 * never in draft mode (`entity-validator/index.ts:377-380`, `:408-411`). The types do not read that
 * setting, so required relations and media stay optional and nullable.
 */
// TODO @Nico follow `strictRelations` through a setting emitted by type generation (plan phase 4)
type IsRelational<TAttribute> = TAttribute extends { type: 'relation' | 'media' } ? true : false;

/**
 * A literal default fills an `undefined` value on create, drafts included
 * (`entity-validator/index.ts:113-133`). An explicit `null` is not replaced. A `null` default is
 * no default. Defaults are not applied on update.
 */
type HasDefault<TAttribute> =
  TAttribute extends Schema.Attribute.DefaultTo<infer TDefault>
    ? [TDefault] extends [null | undefined]
      ? false
      : true
    : false;

/**
 * A field hidden by its `conditions.visible` rule skips validation
 * (`entity-validator/index.ts:449-456`). The rule depends on the data, so the types treat a
 * conditional field as optional and nullable. Type generation marks it with
 * {@link Schema.Attribute.Conditional} (strict types only).
 */
type IsConditional<TAttribute> = TAttribute extends Schema.Attribute.Conditional ? true : false;

type IsRequired<TAttribute> = TAttribute extends Schema.Attribute.Required ? true : false;

/**
 * Whether the key of `TAttribute` must be present in `data`. Only `create` requires keys: the
 * update pass checks `notNull`, not `notNil` (`entity-validator/index.ts:91-111`).
 */
type IsKeyRequired<
  TAttribute,
  TMode extends Status,
  TOperation extends Operation,
> = TOperation extends 'update'
  ? false
  : IsRequired<TAttribute> extends false
    ? false
    : HasDefault<TAttribute> extends true
      ? false
      : IsConditional<TAttribute> extends true
        ? false
        : IsArrayKind<TAttribute> extends true
          ? true
          : IsRelational<TAttribute> extends true
            ? false
            : TMode extends 'published'
              ? true
              : false;

/**
 * Whether `data` may set `TAttribute` to `null`. Draft mode passes `required: false` to the
 * validator, which then accepts `null` (`entity-validator/index.ts:191`, `:437`); arrays keep
 * rejecting it.
 */
type AcceptsNull<TAttribute, TMode extends Status> =
  IsArrayKind<TAttribute> extends true
    ? false
    : IsRequired<TAttribute> extends false
      ? true
      : TMode extends 'draft'
        ? true
        : IsRelational<TAttribute> extends true
          ? true
          : IsConditional<TAttribute> extends true
            ? true
            : false;

/**
 * A component value. Components inherit the mode of their parent. On update, a value with an `id`
 * updates that component in place with the given keys; a value without one creates a new component
 * (`document-service/components.ts:411-427`), so it follows the create rules.
 */
// TODO @Nico the validator checks a new component of an update with update rules (inner required
// keys may be missing). The types follow the create rules; the runtime gap is tracked separately.
type ComponentWrite<
  TComponentUID extends UID.Component,
  TMode extends Status,
  TOperation extends Operation,
> = TOperation extends 'update'
  ? ({ id: ID } & Write<TComponentUID, TMode, 'update'>) | Write<TComponentUID, TMode, 'create'>
  : Write<TComponentUID, TMode, 'create'>;

/**
 * The value of `TAttribute` in `data`, without `null`. Components and dynamic zones recurse with
 * the write rules; every other kind keeps the input values of {@link GetValue}.
 */
type WriteValue<TAttribute, TMode extends Status, TOperation extends Operation> =
  TAttribute extends Schema.Attribute.Component<infer TComponentUID, infer TRepeatable>
    ? TRepeatable extends true
      ? ComponentWrite<TComponentUID, TMode, TOperation>[]
      : ComponentWrite<TComponentUID, TMode, TOperation>
    : TAttribute extends Schema.Attribute.DynamicZone<infer TComponentUIDs>
      ? Array<
          TComponentUIDs[number] extends infer TComponentUID
            ? TComponentUID extends UID.Component
              ? ComponentWrite<TComponentUID, TMode, TOperation> & { __component: TComponentUID }
              : never
            : never
        >
      : TAttribute extends Schema.Attribute.Attribute
        ? GetValue<TAttribute>
        : unknown;

/**
 * The value of `TAttribute` in `data`, `null` included when the validator accepts it. Distributing
 * over `TAttribute` makes editors show the resolved value instead of this alias.
 */
type AttributeWrite<
  TAttribute,
  TMode extends Status,
  TOperation extends Operation,
> = TAttribute extends unknown
  ? | WriteValue<TAttribute, TMode, TOperation>
    | (AcceptsNull<TAttribute, TMode> extends true ? null : never)
  : never;

type Attributes<TSchemaUID extends UID.Schema> = Schema.Schema<TSchemaUID>['attributes'];

/** Morph relations have no target, and `data` cannot write them (`attributes/relations.ts`). */
type IsWritable<TAttribute> = TAttribute extends { relation: 'morphToOne' | 'morphToMany' }
  ? false
  : true;

/**
 * The `data` of a write on a registered schema. Both mapped types iterate `keyof Attributes`, so
 * they are homomorphic: the JSDoc of a generated attribute reaches the input key.
 */
type KnownWrite<
  TSchemaUID extends UID.Schema,
  TMode extends Status,
  TOperation extends Operation,
> = Simplify<
  { id?: ID; documentId?: DocumentID } & {
    [
      TName in keyof Attributes<TSchemaUID> as IsWritable<
        Attributes<TSchemaUID>[TName]
      > extends true
        ? IsKeyRequired<Attributes<TSchemaUID>[TName], TMode, TOperation> extends true
          ? TName
          : never
        : never
    ]-?: AttributeWrite<Attributes<TSchemaUID>[TName], TMode, TOperation>;
  } & {
    [
      TName in keyof Attributes<TSchemaUID> as IsWritable<
        Attributes<TSchemaUID>[TName]
      > extends true
        ? IsKeyRequired<Attributes<TSchemaUID>[TName], TMode, TOperation> extends true
          ? never
          : TName
        : never
    ]?: AttributeWrite<Attributes<TSchemaUID>[TName], TMode, TOperation>;
  }
>;

/**
 * The `data` of a write on `TSchemaUID` (a content type or a component) in validator mode `TMode`
 * for `TOperation`. A schema whose attributes are not known (an index signature, as for
 * unregistered or generic schemas) keeps the develop input, {@link Input}.
 *
 * @example
 * ```ts
 * // `title` is required, `kind` is required with a default, `tags` is a required repeatable component
 * type Draft = Write<'api::article.article', 'draft', 'create'>;
 * // { tags: ...[]; title?: string | null; kind?: 'news' | 'blog' | null; ... }
 * type Published = Write<'api::article.article', 'published', 'create'>;
 * // { tags: ...[]; title: string; kind?: 'news' | 'blog'; ... }
 * ```
 */
export type Write<
  TSchemaUID extends UID.Schema,
  TMode extends Status,
  TOperation extends Operation,
> = string extends keyof Attributes<TSchemaUID>
  ? Input<TSchemaUID>
  : KnownWrite<TSchemaUID, TMode, TOperation>;

/**
 * The `data` of `create` on `TContentTypeUID` with `TStatus`. `create` throws without `data`
 * (`document-service/entries.ts:45-47`).
 */
export type CreateInput<
  TContentTypeUID extends UID.ContentType,
  TStatus extends Status = 'draft',
> = Write<TContentTypeUID, WriteMode<TContentTypeUID, TStatus>, 'create'>;

/**
 * The `data` of `update` and `clone` on `TContentTypeUID` with `TStatus`: every key is optional,
 * `null` follows the mode.
 */
export type UpdateInput<
  TContentTypeUID extends UID.ContentType,
  TStatus extends Status = 'draft',
> = Write<TContentTypeUID, WriteMode<TContentTypeUID, TStatus>, 'update'>;
