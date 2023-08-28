import type { Attribute, Common, EntityService, Utils } from '@strapi/strapi';

type Pagination = { page: number; pageSize: number; pageCount: number; total: number };

type IDProperty = { id: EntityService.Params.Attribute.ID };

type AnyEntity = IDProperty & { [key: string]: any };

export type Result<
  TSchemaUID extends Common.UID.Schema,
  TParams extends EntityService.Params.Pick<TSchemaUID, 'fields' | 'populate'> = never
> = Utils.Expression.If<
  Common.AreSchemaRegistriesExtended,
  GetValues<
    TSchemaUID,
    Utils.Guard.Never<
      ExtractFields<TSchemaUID, TParams['fields']>,
      Attribute.GetNonPopulatableKeys<TSchemaUID>
    >,
    ExtractPopulate<TSchemaUID, TParams['populate']>
  >,
  AnyEntity
>;

export type Entity<
  TSchemaUID extends Common.UID.Schema,
  TParams extends EntityService.Params.Pick<TSchemaUID, 'fields' | 'populate'> = never
> = Utils.Expression.If<
  Common.AreSchemaRegistriesExtended,
  GetValues<
    TSchemaUID,
    Utils.Guard.Never<
      ExtractFields<TSchemaUID, TParams['fields']>,
      Attribute.GetNonPopulatableKeys<TSchemaUID>
    >,
    Utils.Guard.Never<
      ExtractPopulate<TSchemaUID, TParams['populate']>,
      Attribute.GetPopulatableKeys<TSchemaUID>
    >
  >,
  AnyEntity
>;

export type PartialEntity<
  TSchemaUID extends Common.UID.Schema,
  TParams extends EntityService.Params.Pick<TSchemaUID, 'fields' | 'populate'> = never
> = Partial<Entity<TSchemaUID, TParams>>;

export type PaginatedResult<
  TSchemaUID extends Common.UID.Schema,
  TParams extends EntityService.Params.Pick<TSchemaUID, 'fields' | 'populate'> = never
> = {
  results: Entity<TSchemaUID, TParams>[];
  pagination: Pagination;
};

/**
 * Attribute.GetValues override with extended values
 *
 * TODO: Make it recursive for populatable fields
 */
export type GetValues<
  TSchemaUID extends Common.UID.Schema,
  TFields extends Attribute.GetKeys<TSchemaUID>,
  TPopulate extends Attribute.GetKeys<TSchemaUID>
> = Utils.Expression.If<
  Common.AreSchemaRegistriesExtended,
  Utils.Guard.Never<TFields | TPopulate, Attribute.GetKeys<TSchemaUID>> extends infer TKeys
    ? IDProperty & {
        // Handle required attributes
        [key in Attribute.GetRequiredKeys<TSchemaUID> as key extends TKeys
          ? key
          : never]-?: GetValue<Attribute.Get<TSchemaUID, key>>;
      } & {
        // Handle optional attributes
        [key in Attribute.GetOptionalKeys<TSchemaUID> as key extends TKeys
          ? key
          : never]?: GetValue<Attribute.Get<TSchemaUID, key>>;
      }
    : never,
  AnyEntity
>;

type GetValue<TAttribute extends Attribute.Attribute> = Utils.Expression.If<
  Utils.Expression.IsNotNever<TAttribute>,
  // GetValue overrides
  Utils.Expression.MatchFirst<
    [
      // Relation, media and components needs an id property
      [
        Utils.Expression.Extends<TAttribute, Attribute.OfType<'relation' | 'component' | 'media'>>,
        IDProperty & Attribute.GetValue<TAttribute>
      ]
    ],
    // Default GetValue fallback
    Attribute.GetValue<TAttribute>
  >
>;

type ExtractFields<
  TSchemaUID extends Common.UID.Schema,
  TFields extends EntityService.Params.Fields.Any<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    // No fields provided
    [
      Utils.Expression.Or<
        Utils.Expression.StrictEqual<TFields, EntityService.Params.Fields.Any<TSchemaUID>>,
        Utils.Expression.IsNever<TFields>
      >,
      never
    ],
    // string
    [
      Utils.Expression.Extends<TFields, EntityService.Params.Fields.StringNotation<TSchemaUID>>,
      ParseStringFields<
        TSchemaUID,
        Utils.Cast<TFields, EntityService.Params.Fields.StringNotation<TSchemaUID>>
      >
    ],
    // string array
    [
      Utils.Expression.Extends<TFields, EntityService.Params.Fields.ArrayNotation<TSchemaUID>>,
      ParseStringFields<
        TSchemaUID,
        Utils.Cast<
          Utils.Array.Values<
            Utils.Cast<TFields, EntityService.Params.Fields.ArrayNotation<TSchemaUID>>
          >,
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
    [
      Utils.Expression.StrictEqual<TFields, EntityService.Params.Fields.WildcardNotation>,
      Attribute.GetNonPopulatableKeys<TSchemaUID>
    ],
    [
      Utils.Expression.Extends<TFields, EntityService.Params.Fields.SingleAttribute<TSchemaUID>>,
      TFields
    ],
    [
      Utils.Expression.Extends<TFields, `${string},${string}`>,
      Utils.Array.Values<Utils.String.Split<Utils.Cast<TFields, string>, ','>>
    ]
  ]
>;

type ExtractPopulate<
  TSchemaUID extends Common.UID.Schema,
  TPopulate extends EntityService.Params.Populate.Any<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    // No populate provided
    [
      Utils.Expression.Or<
        Utils.Expression.StrictEqual<TPopulate, EntityService.Params.Populate.Any<TSchemaUID>>,
        Utils.Expression.IsNever<TPopulate>
      >,
      never
    ],
    // string notation
    [
      Utils.Expression.Extends<TPopulate, EntityService.Params.Populate.StringNotation<TSchemaUID>>,
      ParseStringPopulate<
        TSchemaUID,
        Utils.Cast<TPopulate, EntityService.Params.Populate.StringNotation<TSchemaUID>>
      >
    ],
    // Array notation
    [
      Utils.Expression.Extends<TPopulate, EntityService.Params.Populate.ArrayNotation<TSchemaUID>>,
      ParseStringPopulate<
        TSchemaUID,
        Utils.Cast<
          Utils.Array.Values<
            Utils.Cast<TPopulate, EntityService.Params.Populate.ArrayNotation<TSchemaUID>>
          >,
          EntityService.Params.Populate.StringNotation<TSchemaUID>
        >
      >
    ],
    // object notation
    [
      Utils.Expression.Extends<TPopulate, EntityService.Params.Populate.ObjectNotation<TSchemaUID>>,
      ParseStringPopulate<
        TSchemaUID,
        Utils.Cast<
          keyof Utils.Object.KeysExcept<TPopulate, false>,
          EntityService.Params.Populate.StringNotation<TSchemaUID>
        >
      >
    ]
  ]
>;

type ParsePopulateDotNotation<
  TSchemaUID extends Common.UID.Schema,
  TPopulate extends EntityService.Params.Populate.StringNotation<TSchemaUID>
> = Utils.String.Split<Utils.Cast<TPopulate, string>, '.'>[0];

type ParseStringPopulate<
  TSchemaUID extends Common.UID.Schema,
  TPopulate extends EntityService.Params.Populate.StringNotation<TSchemaUID>
> = Utils.Expression.MatchFirst<
  [
    [
      Utils.Expression.StrictEqual<EntityService.Params.Populate.WildcardNotation, TPopulate>,
      Attribute.GetPopulatableKeys<TSchemaUID>
    ],
    [
      Utils.Expression.Extends<TPopulate, `${string},${string}`>,
      ParsePopulateDotNotation<
        TSchemaUID,
        Utils.Cast<
          Utils.Array.Values<Utils.String.Split<Utils.Cast<TPopulate, string>, ','>>,
          EntityService.Params.Populate.StringNotation<TSchemaUID>
        >
      >
    ],
    [
      Utils.Expression.Extends<TPopulate, `${string}.${string}`>,
      ParsePopulateDotNotation<TSchemaUID, TPopulate>
    ]
  ],
  TPopulate
>;
