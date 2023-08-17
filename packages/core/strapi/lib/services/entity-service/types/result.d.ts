import type { Attribute, Common, EntityService, Utils } from '@strapi/strapi';

type Pagination = { page: number; pageSize: number; pageCount: number; total: number };

export type Entity<
  TSchemaUID extends Common.UID.Schema,
  TParams extends EntityService.Params.Pick<TSchemaUID, 'fields' | 'populate'>
> = Utils.Object.DeepPartial<
  GetValues<
    TSchemaUID,
    As<ExtractFields<TSchemaUID, TParams['fields']>, Attribute.GetNonPopulatableKeys<TSchemaUID>>,
    As<ExtractPopulate<TSchemaUID, TParams['populate']>, Attribute.GetPopulatableKeys<TSchemaUID>>
  >
>;

export type PaginatedResult<
  TSchemaUID extends Common.UID.Schema,
  TParams extends EntityService.Params.Pick<TSchemaUID, 'fields' | 'populate'>
> = {
  results: Entity<TSchemaUID, TParams>[];
  pagination: Pagination;
};

/**
 * Attribute.GetValues override with extended values
 */
export type GetValues<
  TSchemaUID extends Common.UID.Schema,
  TFields extends Attribute.GetKeys<TSchemaUID>,
  TPopulate extends Attribute.GetKeys<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    [
      Utils.Expression.Extends<TFields, never>,
      Utils.Expression.MatchFirst<
        [
          [
            Utils.Expression.Extends<TPopulate, never>,
            GetOwnValues<TSchemaUID, Attribute.GetNonPopulatableKeys<TSchemaUID>>
          ],
          [
            Utils.Expression.Extends<TPopulate, Attribute.GetPopulatableKeys<TSchemaUID>>,
            GetOwnValues<TSchemaUID, Attribute.GetNonPopulatableKeys<TSchemaUID> | TPopulate>
          ]
        ]
      >
    ],
    [
      Utils.Expression.Extends<TFields, Attribute.GetKeys<TSchemaUID>>,
      Utils.Expression.MatchFirst<
        [
          [Utils.Expression.Extends<TPopulate, never>, GetOwnValues<TSchemaUID, TFields>],
          [
            Utils.Expression.Extends<TPopulate, Attribute.GetPopulatableKeys<TSchemaUID>>,
            GetOwnValues<TSchemaUID, TFields | TPopulate>
          ]
        ]
      >
    ]
  ]
>;

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

/**
 * attributes values => <uid, fields>
 */

// transform fields (string | string[]) & populate (object, string, string[]) -> string union (keys)

type As<T, P> = T extends P ? T : never;

type ExtractFields<
  TSchemaUID extends Common.UID.Schema,
  TFields extends EntityService.Params.Fields.Any<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    // string
    [
      Utils.Expression.Extends<TFields, EntityService.Params.Fields.StringNotation<TSchemaUID>>,
      ParseStringFields<
        TSchemaUID,
        As<TFields, EntityService.Params.Fields.StringNotation<TSchemaUID>>
      >
    ],
    // string array
    [
      Utils.Expression.Extends<TFields, EntityService.Params.Fields.ArrayNotation<TSchemaUID>>,
      ParseStringFields<
        TSchemaUID,
        As<
          Utils.Array.Values<As<TFields, EntityService.Params.Fields.ArrayNotation<TSchemaUID>>>,
          EntityService.Params.Fields.StringNotation<TSchemaUID>
        >
      >
    ]
  ]
>;

type ParseStringFields<
  TSchemaUID extends Common.UID.Schema,
  TFields extends EntityService.Params.Fields.StringNotation<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    [Utils.Expression.IsNever<TFields>, Attribute.GetNonPopulatableKeys<TSchemaUID>],
    [
      Utils.Expression.Extends<EntityService.Params.Fields.WildcardNotation, TFields>,
      Attribute.GetNonPopulatableKeys<TSchemaUID>
    ],
    [
      Utils.Expression.Extends<TFields, EntityService.Params.Fields.SingleAttribute<TSchemaUID>>,
      TFields
    ],
    [
      // what aobut * in comma separated list
      Utils.Expression.Extends<TFields, `${string},${string}`>,
      Utils.Array.Values<Utils.String.Split<As<TFields, string>, ','>>
    ]
  ]
>;

type ExtractPopulate<
  TSchemaUID extends Common.UID.Schema,
  TPopulate extends EntityService.Params.Populate.Any<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    [
      Utils.Expression.Extends<TPopulate, EntityService.Params.Populate.StringNotation<TSchemaUID>>,
      ParseStringPopulate<
        TSchemaUID,
        As<TPopulate, EntityService.Params.Populate.StringNotation<TSchemaUID>>
      >
    ],
    [
      Utils.Expression.Extends<TPopulate, EntityService.Params.Populate.ArrayNotation<TSchemaUID>>,
      ParseStringPopulate<
        TSchemaUID,
        As<
          Utils.Array.Values<
            As<TPopulate, EntityService.Params.Populate.ArrayNotation<TSchemaUID>>
          >,
          EntityService.Params.Populate.StringNotation<TSchemaUID>
        >
      >
    ],
    [Utils.Expression.Extends<Object, TPopulate>, never],
    [
      Utils.Expression.Extends<TPopulate, EntityService.Params.Populate.ObjectNotation<TSchemaUID>>,
      ParseStringPopulate<
        TSchemaUID,
        As<keyof TPopulate, EntityService.Params.Populate.StringNotation<TSchemaUID>>
      >
    ]
  ],
  never
>;

type ParseStringPopulate<
  TSchemaUID extends Common.UID.Schema,
  TPopulate extends EntityService.Params.Populate.StringNotation<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    [Utils.Expression.IsNever<TPopulate>, Attribute.GetPopulatableKeys<TSchemaUID>],
    [
      Utils.Expression.Extends<EntityService.Params.Populate.WildcardNotation, TPopulate>,
      Attribute.GetPopulatableKeys<TSchemaUID>
    ],
    [
      // what aobut * in comma separated list
      Utils.Expression.Extends<TPopulate, `${string},${string}`>,
      Utils.Array.Values<Utils.String.Split<As<TPopulate, string>, ','>>
    ],
    [
      Utils.Expression.Extends<TPopulate, EntityService.Params.Populate.StringNotation<TSchemaUID>>,
      TPopulate
    ]
  ]
>;

type GetOwnValues<
  TSchemaUID extends Common.UID.Schema,
  TKey extends Attribute.GetKeys<TSchemaUID> = Attribute.GetKeys<TSchemaUID>
> = { id: string } & {
  // Handle required attributes
  [key in Attribute.GetRequiredKeys<TSchemaUID> as key extends TKey ? key : never]-?: GetValue<
    Attribute.Get<TSchemaUID, key>
  >;
} & {
  // Handle optional attributes
  [key in Attribute.GetOptionalKeys<TSchemaUID> as key extends TKey ? key : never]?: GetValue<
    Attribute.Get<TSchemaUID, key>
  >;
};
