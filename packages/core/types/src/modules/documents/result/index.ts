import type * as Schema from '../../../schema';
import type * as Data from '../../../data';

import type * as UID from '../../../uid';
import type {
  Array,
  Constants,
  Guard,
  String,
  Cast,
  If,
  Extends,
  MatchFirst,
  Or,
  StrictEqual,
  IsNever,
} from '../../../utils';
import type { Params } from '..';

type Pagination = { page: number; pageSize: number; pageCount: number; total: number };

export type AnyDocument = { documentId: string; id: Data.ID } & { [key: string]: any };

export type Result<
  TSchemaUID extends UID.Schema,
  TParams extends Params.Pick<TSchemaUID, 'fields' | 'populate'> = never,
> = If<
  Constants.IsSchemaRegistered<TSchemaUID>,
  GetValues<
    TSchemaUID,
    Guard.Never<
      ExtractFields<TSchemaUID, TParams['fields']>,
      Schema.NonPopulatableAttributeNames<TSchemaUID>
    >,
    ExtractPopulate<TSchemaUID, TParams['populate']>
  >,
  AnyDocument
>;

export type Document<
  TSchemaUID extends UID.Schema,
  TParams extends Params.Pick<TSchemaUID, 'fields' | 'populate'> = never,
> = If<
  Constants.IsSchemaRegistered<TSchemaUID>,
  GetValues<
    TSchemaUID,
    Guard.Never<
      ExtractFields<TSchemaUID, TParams['fields']>,
      Schema.NonPopulatableAttributeNames<TSchemaUID>
    >,
    Guard.Never<
      ExtractPopulate<TSchemaUID, TParams['populate']>,
      Schema.PopulatableAttributeNames<TSchemaUID>
    >
  >,
  AnyDocument
>;

export type PartialDocument<
  TSchemaUID extends UID.Schema,
  TParams extends Params.Pick<TSchemaUID, 'fields' | 'populate'> = never,
> = Partial<Document<TSchemaUID, TParams>>;

export type PaginatedResult<
  TSchemaUID extends UID.Schema,
  TParams extends Params.Pick<TSchemaUID, 'fields' | 'populate'> = never,
> = {
  results: Document<TSchemaUID, TParams>[];
  pagination: Pagination;
};

/**
 * Attribute.GetValues override with extended values
 */
export type GetValues<
  TSchemaUID extends UID.Schema,
  TFields extends Schema.AttributeNames<TSchemaUID> =
    Schema.NonPopulatableAttributeNames<TSchemaUID>,
  TPopulate extends Schema.AttributeNames<TSchemaUID> =
    Schema.PopulatableAttributeNames<TSchemaUID>,
> = If<
  Constants.IsSchemaRegistered<TSchemaUID>,
  Guard.Never<TFields | TPopulate, Schema.AttributeNames<TSchemaUID>> extends infer TKeys extends
    Schema.AttributeNames<TSchemaUID>
    ? Data.Entity<TSchemaUID, TKeys>
    : never,
  AnyDocument
>;

type ExtractFields<
  TSchemaUID extends UID.Schema,
  TFields extends Params.Fields.Any<TSchemaUID> | undefined,
> = Extract<
  MatchFirst<
    [
      // No fields provided
      [
        Or<
          StrictEqual<TFields, Params.Fields.Any<TSchemaUID>>,
          Or<IsNever<TFields>, StrictEqual<TFields, undefined>>
        >,
        never,
      ],
      // string
      [
        Extends<TFields, Params.Fields.StringNotation<TSchemaUID>>,
        ParseStringFields<TSchemaUID, Cast<TFields, Params.Fields.StringNotation<TSchemaUID>>>,
      ],
      // string array
      [
        Extends<TFields, Params.Fields.ArrayNotation<TSchemaUID>>,
        ParseStringFields<
          TSchemaUID,
          Cast<
            Array.Values<Cast<TFields, Params.Fields.ArrayNotation<TSchemaUID>>>,
            Params.Fields.StringNotation<TSchemaUID>
          >
        >,
      ],
    ]
  >,
  Schema.NonPopulatableAttributeNames<TSchemaUID>
>;

type ParseStringFields<
  TSchemaUID extends UID.Schema,
  TFields extends Params.Fields.StringNotation<TSchemaUID>,
> = MatchFirst<
  [
    [
      StrictEqual<TFields, Params.Fields.WildcardNotation>,
      Schema.NonPopulatableAttributeNames<TSchemaUID>,
    ],
    [Extends<TFields, Params.Fields.SingleAttribute<TSchemaUID>>, TFields],
    [
      Extends<TFields, `${string},${string}`>,
      Array.Values<String.Split<Cast<TFields, string>, ','>>,
    ],
  ]
>;

type ExtractPopulate<
  TSchemaUID extends UID.Schema,
  TPopulate extends Params.Populate.Any<TSchemaUID> | undefined,
> = Extract<
  MatchFirst<
    [
      // No populate provided
      [Or<StrictEqual<TPopulate, Params.Populate.Any<TSchemaUID>>, IsNever<TPopulate>>, never],
      // string notation
      [
        Extends<TPopulate, Params.Populate.StringNotation<TSchemaUID>>,
        ParseStringPopulate<
          TSchemaUID,
          Cast<TPopulate, Params.Populate.StringNotation<TSchemaUID>>
        >,
      ],
      // Array notation
      [
        Extends<TPopulate, Params.Populate.ArrayNotation<TSchemaUID>>,
        ParseStringPopulate<
          TSchemaUID,
          Cast<
            Array.Values<Cast<TPopulate, Params.Populate.ArrayNotation<TSchemaUID>>>,
            Params.Populate.StringNotation<TSchemaUID>
          >
        >,
      ],
      // object notation
      [
        Extends<TPopulate, Params.Populate.ObjectNotation<TSchemaUID>>,
        ParseStringPopulate<
          TSchemaUID,
          // TODO: Handle relations set to false in object notation
          Cast<keyof TPopulate, Params.Populate.StringNotation<TSchemaUID>>
        >,
      ],
    ]
  >,
  Schema.PopulatableAttributeNames<TSchemaUID>
>;

type ParsePopulateDotNotation<
  TSchemaUID extends UID.Schema,
  TPopulate extends Params.Populate.StringNotation<TSchemaUID>,
> = Cast<
  String.Split<Cast<TPopulate, string>, '.'>[0],
  Schema.PopulatableAttributeNames<TSchemaUID>
>;

type ParseStringPopulate<
  TSchemaUID extends UID.Schema,
  TPopulate extends Params.Populate.StringNotation<TSchemaUID>,
> = MatchFirst<
  [
    [
      StrictEqual<Params.Populate.WildcardNotation, TPopulate>,
      Schema.PopulatableAttributeNames<TSchemaUID>,
    ],
    [
      Extends<TPopulate, `${string},${string}`>,
      ParsePopulateDotNotation<
        TSchemaUID,
        Cast<
          Array.Values<String.Split<Cast<TPopulate, string>, ','>>,
          Params.Populate.StringNotation<TSchemaUID>
        >
      >,
    ],
    [Extends<TPopulate, `${string}.${string}`>, ParsePopulateDotNotation<TSchemaUID, TPopulate>],
  ],
  TPopulate
>;

/**
 * The publication status of the entries a call reads or returns: `'draft'` or `'published'`.
 */
export type PublicationStatus = 'draft' | 'published';

/**
 * The status of a call, from its params.
 *
 * - A `status` literal in the params is the status.
 * - No `status` key: `TDefault`, the default of the caller. Document Service reads default to
 *   `'draft'`; the core service sends `{ status: 'published', ...params }`, so it defaults to
 *   `'published'`.
 * - A `status` key that may be `undefined`: `TUndefined` too. The core service spreads the params
 *   over its default, so an explicit `status: undefined` reaches the Document Service, which reads
 *   drafts.
 * - A wide status (`'draft' | 'published'`) keeps both: the call may read either.
 */
export type StatusOf<
  TParams,
  TDefault extends PublicationStatus,
  TUndefined extends PublicationStatus = TDefault,
> = [TParams] extends [never]
  ? TDefault
  : TParams extends { status?: infer TStatus }
    ? unknown extends TStatus
      ? TDefault
      : Extract<TStatus, PublicationStatus> | (undefined extends TStatus ? TUndefined : never)
    : TDefault;

/**
 * Whether draft and publish is on for `TSchemaUID`: `true`, `false`, or `boolean` when the schema
 * does not tell. The runtime only enables it when `options.draftAndPublish` is `true`
 * (`contentTypes.hasDraftAndPublish` in `@strapi/utils`), so a missing option is `false`.
 */
type DraftAndPublishOf<TSchemaUID extends UID.Schema> =
  Schema.Schema<TSchemaUID>['options'] extends infer TOptions
    ? TOptions extends { draftAndPublish: infer TEnabled }
      ? TEnabled extends boolean
        ? TEnabled
        : false
      : false
    : boolean;

/**
 * The `publishedAt` of a result.
 *
 * Every content type has a `publishedAt` attribute, draft and publish or not. Without draft and
 * publish, every write sets it to the write date, so it is a string. With draft and publish, a
 * published entry holds its publication date and a draft holds `null`. A call that may read either
 * status, or a schema that does not tell whether draft and publish is on, gets `string | null`.
 */
type PublishedAtValue<TSchemaUID extends UID.Schema, TStatus extends PublicationStatus> = [
  DraftAndPublishOf<TSchemaUID>,
] extends [false]
  ? string
  : [DraftAndPublishOf<TSchemaUID>] extends [true]
    ? TStatus extends 'published'
      ? string
      : null
    : string | null;

/**
 * The `locale` of a result. The i18n plugin is always loaded and adds `locale` to every content type.
 * A localized content type (`pluginOptions.i18n.localized: true`) always has one: enabling
 * localization fills the default locale in. Other content types hold `null`, unless a write passed a
 * locale.
 */
type LocaleValue<TSchemaUID extends UID.Schema> =
  NonNullable<Schema.Schema<TSchemaUID>['pluginOptions']> extends { i18n: { localized: true } }
    ? string
    : string | null;

/**
 * The value of a selected scalar attribute in a result. The key is always present: the query engine
 * returns every selected column, `null` when it is unset.
 *
 * - `Required` does not remove `null`: drafts skip the required check, a field made required later
 *   is not filled in, a hidden conditional field is not validated, and raw queries or imports bypass
 *   validation. Each of these was observed on a published read.
 * - `datetime`, `date`, `time` and `timestamp` values are strings: the query engine formats them on
 *   every database (`timestamp` as epoch milliseconds, e.g. `'1709528767890'`). Inputs still accept
 *   `Date` objects.
 * - `createdAt` and `updatedAt` are set by every write, so they are strings.
 */
type ScalarValue<
  TSchemaUID extends UID.Schema,
  TName extends Schema.AttributeNames<TSchemaUID>,
  TStatus extends PublicationStatus,
> = TName extends 'publishedAt'
  ? PublishedAtValue<TSchemaUID, TStatus>
  : TName extends 'locale'
    ? LocaleValue<TSchemaUID>
    : TName extends 'createdAt' | 'updatedAt'
      ? string
      : Schema.AttributeByName<TSchemaUID, TName> extends {
            type: 'datetime' | 'date' | 'time' | 'timestamp';
          }
        ? string | null
        : Schema.AttributeValueByName<TSchemaUID, TName> | null;

/**
 * The value of a populated attribute in a result. A to-many relation, a repeatable component, a
 * dynamic zone or a multiple media is an array, empty when there is nothing to populate, never
 * `null`. A to-one relation, a single component or a single media is `null` when there is nothing.
 *
 * The populated value itself is the attribute's value type, the target entity with every attribute:
 * see the TODO on {@link GetValues}.
 */
type PopulatedValue<TValue> = TValue extends readonly unknown[] ? TValue : TValue | null;

/**
 * The value of a relation populated with `count: true`. The query engine counts the related entries
 * instead of reading them, for to-one relations too, and returns `{ count: 0 }` when there is none.
 */
type PopulatedCount = { count: number };

/**
 * Whether `count: true` populates the count of the attribute `TName`. The query engine counts only
 * relations stored in a join table (`applyPopulate` in `@strapi/database`). Media and `morphOne` or
 * `morphMany` relations ignore `count` and are populated as usual.
 */
type IsCountable<TSchemaUID extends UID.Schema, TName extends Schema.AttributeNames<TSchemaUID>> =
  Schema.AttributeByName<TSchemaUID, TName> extends infer TAttribute
    ? TAttribute extends { type: 'relation'; relation: infer TRelation }
      ? TRelation extends `morph${string}`
        ? false
        : TAttribute extends { useJoinTable: false }
          ? false
          : true
      : false
    : false;

/**
 * What a populate clause makes of an attribute: `'value'` for the attribute's value, `'count'` for
 * its count. A clause whose `count` may be `true` may give the count; a clause whose `count` may be
 * something else, or that has no `count`, may give the value.
 */
type PopulateClauseKinds<TClause> = TClause extends object
  ? 'count' extends keyof TClause
    ? | (true extends TClause['count'] ? 'count' : never)
      | ([Exclude<TClause['count'], true>] extends [never] ? never : 'value')
    : 'value'
  : 'value';

/**
 * The clauses of an object notation populate, by attribute name, across the members of a union. A
 * member that omits an attribute gives `undefined` for it.
 */
type ObjectPopulateClauses<TSchemaUID extends UID.Schema, TPopulate> = {
  [
    TName in Extract<
      TPopulate extends unknown ? keyof TPopulate : never,
      Schema.PopulatableAttributeNames<TSchemaUID>
    >
  ]: TPopulate extends unknown
    ? TName extends keyof TPopulate
      ? TPopulate[TName]
      : undefined
    : never;
};

/**
 * The populate clause of each attribute a strict result may populate. The object notation keeps
 * each clause: `false` (and an omitted key) populates nothing, as the runtime drops it
 * (`convertPopulateObject` in `@strapi/utils`). The other notations populate every attribute they
 * list, with a `true` clause.
 */
type StrictPopulateClauses<
  TSchemaUID extends UID.Schema,
  TPopulate extends Params.Populate.Any<TSchemaUID> | undefined,
> = [TPopulate] extends [Params.Populate.ObjectNotation<TSchemaUID>]
  ? ObjectPopulateClauses<TSchemaUID, TPopulate>
  : { [TName in ExtractPopulate<TSchemaUID, TPopulate>]: true };

/** The clauses of `TClauses` that populate their attribute: neither `false` nor omitted. */
type PopulatingClause<TClauses, TName> = TName extends keyof TClauses
  ? Exclude<TClauses[TName], false | undefined>
  : never;

/** The attribute names of `TClauses` that are always populated. */
type RequiredPopulatedNames<TClauses> = {
  [TName in keyof TClauses]: [PopulatingClause<TClauses, TName>] extends [never]
    ? never
    : [Extract<TClauses[TName], false | undefined>] extends [never]
      ? TName
      : never;
}[keyof TClauses];

/**
 * The attribute names of `TClauses` that may be populated: a dynamic boolean, an optional key, or a
 * key that only some members of a union populate.
 */
type OptionalPopulatedNames<TClauses> = {
  [TName in keyof TClauses]: [PopulatingClause<TClauses, TName>] extends [never]
    ? never
    : [Extract<TClauses[TName], false | undefined>] extends [never]
      ? never
      : TName;
}[keyof TClauses];

/** The value of a populated attribute in a strict result, from its populate clauses. */
type StrictPopulatedValue<
  TSchemaUID extends UID.Schema,
  TName extends Schema.AttributeNames<TSchemaUID>,
  TClause,
> = (
  IsCountable<TSchemaUID, TName> extends true ? PopulateClauseKinds<TClause> : 'value'
) extends infer TKinds
  ? | ('value' extends TKinds
        ? PopulatedValue<Schema.AttributeValueByName<TSchemaUID, TName>>
        : never)
    | ('count' extends TKinds ? PopulatedCount : never)
  : never;

/**
 * A strict result entry: `id` and `documentId`, every selected scalar attribute (no `?`), and every
 * populated attribute. Unselected scalars and unpopulated attributes are absent. An attribute that
 * may be populated, for a dynamic boolean, is optional.
 */
type StrictEntry<
  TSchemaUID extends UID.Schema,
  TScalars extends Schema.AttributeNames<TSchemaUID>,
  TClauses,
  TStatus extends PublicationStatus,
> = [
  Extract<RequiredPopulatedNames<TClauses>, Schema.AttributeNames<TSchemaUID>>,
  Extract<OptionalPopulatedNames<TClauses>, Schema.AttributeNames<TSchemaUID>>,
] extends [
  infer TPopulated extends Schema.AttributeNames<TSchemaUID>,
  infer TMaybePopulated extends Schema.AttributeNames<TSchemaUID>,
]
  ? { id: Data.ID; documentId: Data.DocumentID } & {
      -readonly [TName in TScalars | TPopulated]-?: TName extends TPopulated
        ? StrictPopulatedValue<TSchemaUID, TName, PopulatingClause<TClauses, TName>>
        : ScalarValue<TSchemaUID, TName, TStatus>;
    } & ([TMaybePopulated] extends [never]
        ? unknown
        : {
            -readonly [TName in TMaybePopulated]+?: StrictPopulatedValue<
              TSchemaUID,
              TName,
              PopulatingClause<TClauses, TName>
            >;
          })
  : never;

/**
 * The result of a Document Service or core service call with strict types, for the entries of
 * `TSchemaUID` read with `TParams`.
 *
 * It describes what the runtime returns, not what the schema asks for:
 *
 * - `id` and `documentId` are always present, `fields` included.
 * - Each selected scalar attribute (all of them without `fields`) is present and may be `null`,
 *   `Required` ones included. Private attributes are present: only content API controllers remove
 *   them.
 * - `publishedAt` follows draft and publish and the status of the call ({@link StatusOf} with
 *   `TDefaultStatus`, the caller's default), `locale` follows localization, dates are strings.
 * - Populated attributes are present; to-many ones are arrays. Unpopulated relations, components,
 *   dynamic zones and media are absent, keys populated with `false` included. A key populated with a
 *   dynamic boolean is optional. A relation populated with `count: true` is `{ count: number }`.
 *
 * Without registered schemas, any document, as {@link Result}.
 *
 * @template TSchemaUID - The schema of the entries.
 * @template TParams - The params of the call: `fields`, `populate` and `status` are read.
 * @template TDefaultStatus - The status the caller reads when the params have no `status`.
 * @template TUndefinedStatus - The status read when the params pass `status: undefined`.
 */
export type StrictResult<
  TSchemaUID extends UID.Schema,
  TParams,
  TDefaultStatus extends PublicationStatus,
  TUndefinedStatus extends PublicationStatus = TDefaultStatus,
> = If<
  Constants.IsSchemaRegistered<TSchemaUID>,
  StrictEntry<
    TSchemaUID,
    Guard.Never<
      ExtractFields<TSchemaUID, ReadParams<TSchemaUID, TParams>['fields']>,
      Schema.NonPopulatableAttributeNames<TSchemaUID>
    >,
    StrictPopulateClauses<TSchemaUID, ReadParams<TSchemaUID, TParams>['populate']>,
    StatusOf<TParams, TDefaultStatus, TUndefinedStatus>
  >,
  AnyDocument
>;

/**
 * The `fields` and `populate` of `TParams`, when they are valid params of `TSchemaUID`. Other params
 * read every scalar and populate nothing, as the runtime does without them.
 */
type ReadParams<TSchemaUID extends UID.Schema, TParams> =
  TParams extends Params.Pick<TSchemaUID, 'fields' | 'populate'>
    ? TParams
    : Params.Pick<TSchemaUID, 'fields' | 'populate'>;
