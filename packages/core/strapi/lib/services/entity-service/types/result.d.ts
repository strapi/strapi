import type { Attribute, Common, EntityService, Utils } from '@strapi/strapi';

type Pagination = { page: number; pageSize: number; pageCount: number; total: number };

export type Entity<TSchemaUID extends Common.UID.Schema> = Utils.Object.DeepPartial<
  GetValues<TSchemaUID>
>;

export type PaginatedResult<TSchemaUID extends Common.UID.Schema> = {
  results: Entity<TSchemaUID>[];
  pagination: Pagination;
};

/**
 * Attribute.GetValues override with extended values
 */
export type GetValues<TSchemaUID extends Common.UID.Schema> = {
  [TKey in Attribute.GetKeys<TSchemaUID>]?: Utils.Guard.Never<
    GetValue<Attribute.Get<TSchemaUID, TKey>>,
    unknown
  >;
} & { id: EntityService.Params.Attribute.ID };

type GetValue<TAttribute extends Attribute.Attribute> = Utils.Expression.If<
  Utils.Expression.IsNotNever<TAttribute>,
  // GetValue overrides
  Utils.Expression.MatchFirst<
    [
      // Relation, media and components needs an id property
      [
        Utils.Expression.Extends<TAttribute, Attribute.OfType<'relation' | 'component' | 'media'>>,
        { id: EntityService.Params.Attribute.ID } & Attribute.GetValue<TAttribute>
      ]
    ],
    // Default GetValue fallback
    Attribute.GetValue<TAttribute>
  >
>;
