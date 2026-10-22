import type * as Schema from '../schema';
import type * as UID from '../uid';
import type { Constants, Guard, If } from '../utils';
import type { Params as DocumentParams } from '../modules/documents';

/**
 * Attribute names that can be selected at the database level (scalar attributes + identifiers).
 */
export type SelectableAttribute<TSchemaUID extends UID.Schema> =
  DocumentParams.Fields.SingleAttribute<TSchemaUID>;

/**
 * Attribute names that can be populated at the database level (relations, components, media, dynamic zones).
 */
export type PopulatableAttribute<TSchemaUID extends UID.Schema> = Guard.Never<
  Schema.PopulatableAttributeNames<TSchemaUID>,
  string
>;

/**
 * `select` param — a single attribute name or a list of attribute names.
 */
export type Select<TSchemaUID extends UID.Schema> =
  SelectableAttribute<TSchemaUID> | readonly SelectableAttribute<TSchemaUID>[];

/**
 * `where` param — shares the operators & shape of the document service filters.
 */
export type Where<TSchemaUID extends UID.Schema> = DocumentParams.Filters.Any<TSchemaUID>;

/**
 * Context given to a {@link Filters} function, for the root query and for every nested populate query.
 */
export type FiltersContext = Readonly<{
  qb: unknown;
  uid: UID.Schema;
  meta: { readonly uid: UID.Schema };
  db: unknown;
}>;

/**
 * `filters` param — like `where`, or a function resolving the conditions for each query it applies to,
 * including nested populate queries.
 */
export type Filters<TSchemaUID extends UID.Schema> =
  Where<TSchemaUID> | ((context: FiltersContext) => Where<UID.Schema> | null | undefined);

export type OrderDirection = 'asc' | 'desc' | 'ASC' | 'DESC';

type OrderByAttribute<TSchemaUID extends UID.Schema> =
  'id' | Guard.Never<Schema.NonPopulatableAttributeNames<TSchemaUID>, string>;

type OrderByRelation<TSchemaUID extends UID.Schema> = Exclude<
  Schema.AttributeNamesWithTarget<TSchemaUID>,
  OrderByAttribute<TSchemaUID>
>;

/**
 * `orderBy` object notation — `{ attribute: 'asc' | 'desc' }`, nested for relations.
 */
export type OrderByObjectNotation<TSchemaUID extends UID.Schema> = {
  readonly [TAttributeName in OrderByAttribute<TSchemaUID>]?: OrderDirection;
} & {
  readonly [TAttributeName in OrderByRelation<TSchemaUID>]?: OrderByObjectNotation<
    PopulateTarget<TSchemaUID, TAttributeName>
  >;
};

/**
 * `orderBy` param — an attribute name, an object notation or a list of those.
 */
export type OrderBy<TSchemaUID extends UID.Schema> =
  | OrderByAttribute<TSchemaUID>
  | OrderByObjectNotation<TSchemaUID>
  | ReadonlyArray<OrderByAttribute<TSchemaUID> | OrderByObjectNotation<TSchemaUID>>;

/**
 * Resolves the schema targeted by a populatable attribute.
 *
 * Falls back to {@link UID.Schema} when the target can't be resolved (polymorphic relations, loose registries).
 */
export type PopulateTarget<TSchemaUID extends UID.Schema, TAttributeName extends string> =
  TAttributeName extends Schema.AttributeNamesWithTarget<TSchemaUID>
    ? Guard.Never<
        Extract<
          Schema.Attribute.Target<Schema.AttributeByName<TSchemaUID, TAttributeName>>,
          UID.Schema
        >,
        UID.Schema
      >
    : UID.Schema;

/**
 * Nested populate options applied to the populated target.
 */
export type PopulateFragment<TSchemaUID extends UID.Schema> = Readonly<{
  select?: Select<TSchemaUID>;
  where?: Where<TSchemaUID>;
  filters?: Filters<TSchemaUID>;
  orderBy?: OrderBy<TSchemaUID>;
  ordering?: 'desc' | 'asc';
  populate?: Populate<TSchemaUID>;
  limit?: number;
  offset?: number;
  count?: boolean;
  /**
   * Per-target populate for polymorphic attributes (dynamic zones, morph relations).
   */
  on?: { readonly [TTargetUID in UID.Schema]?: PopulateFragment<TTargetUID> };
}>;

export type PopulateObjectNotation<TSchemaUID extends UID.Schema> = {
  readonly [TAttributeName in PopulatableAttribute<TSchemaUID>]?:
    boolean | PopulateFragment<PopulateTarget<TSchemaUID, TAttributeName>>;
};

/**
 * `populate` param.
 *
 * - `true` populates every relation at the root level
 * - a list of attribute names, with dot notation for nested populate (`['author', 'author.avatar']`)
 * - an object notation with nested options per attribute
 */
export type Populate<TSchemaUID extends UID.Schema> =
  | boolean
  | Readonly<DocumentParams.Populate.ArrayNotation<TSchemaUID>>
  | PopulateObjectNotation<TSchemaUID>;

/**
 * Params are readonly: the query engine doesn't mutate them, except for the entries in `data`.
 * Note that lifecycle subscribers receive the same `params` object (`event.params`).
 */

/**
 * Data accepted when writing an entry.
 *
 * Not readonly: the built-in timestamps lifecycle subscriber sets `createdAt` / `updatedAt`
 * on the given data object.
 */
export type Data<TSchemaUID extends UID.Schema> = If<
  Constants.AreSchemaRegistriesExtended,
  DocumentParams.Data.Input<TSchemaUID>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interfaces have no implicit index signature
  Record<string, any>
>;

export type PartialData<TSchemaUID extends UID.Schema> = If<
  Constants.AreSchemaRegistriesExtended,
  Partial<DocumentParams.Data.Input<TSchemaUID>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- interfaces have no implicit index signature
  Record<string, any>
>;

export type FindOne<TSchemaUID extends UID.Schema> = Readonly<{
  where?: Where<TSchemaUID>;
  filters?: Filters<TSchemaUID>;
  select?: Select<TSchemaUID>;
  populate?: Populate<TSchemaUID>;
  orderBy?: OrderBy<TSchemaUID>;
  offset?: number;
  _q?: string;
}>;

export type FindMany<TSchemaUID extends UID.Schema> = FindOne<TSchemaUID> & {
  readonly limit?: number;
};

export type FindPage<TSchemaUID extends UID.Schema> = Omit<FindOne<TSchemaUID>, 'offset'> & {
  readonly page?: number;
  readonly pageSize?: number;
};

export type Count<TSchemaUID extends UID.Schema> = Pick<
  FindMany<TSchemaUID>,
  'where' | 'filters' | '_q' | 'limit' | 'offset'
>;

export type Create<TSchemaUID extends UID.Schema> = Readonly<{
  data: Data<TSchemaUID>;
  select?: Select<TSchemaUID>;
  populate?: Populate<TSchemaUID>;
}>;

export type CreateMany<TSchemaUID extends UID.Schema> = Readonly<{
  data: readonly Data<TSchemaUID>[];
}>;

export type Update<TSchemaUID extends UID.Schema> = Readonly<{
  where: Where<TSchemaUID>;
  data: PartialData<TSchemaUID>;
  select?: Select<TSchemaUID>;
  populate?: Populate<TSchemaUID>;
}>;

export type UpdateMany<TSchemaUID extends UID.Schema> = Readonly<{
  where?: Where<TSchemaUID>;
  data: PartialData<TSchemaUID>;
}>;

export type Delete<TSchemaUID extends UID.Schema> = Readonly<{
  where: Where<TSchemaUID>;
  select?: Select<TSchemaUID>;
  populate?: Populate<TSchemaUID>;
}>;

export type DeleteMany<TSchemaUID extends UID.Schema> = Readonly<{
  where?: Where<TSchemaUID>;
}>;

export type LoadField<TSchemaUID extends UID.Schema> =
  PopulatableAttribute<TSchemaUID> | readonly PopulatableAttribute<TSchemaUID>[];

export type LoadedAttribute<TField> = TField extends readonly (infer TAttributeName)[]
  ? Extract<TAttributeName, string>
  : Extract<TField, string>;

export type Load<TSchemaUID extends UID.Schema> = PopulateFragment<TSchemaUID>;

export type LoadPages<TSchemaUID extends UID.Schema> = Omit<
  PopulateFragment<TSchemaUID>,
  'limit' | 'offset' | 'count'
> & {
  readonly page?: number;
  readonly pageSize?: number;
};
