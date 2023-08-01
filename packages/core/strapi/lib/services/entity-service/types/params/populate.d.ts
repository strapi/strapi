import type { Attribute, Common, Utils } from '@strapi/strapi';
import type * as Params from './index';

/**
 * Wildcard notation for populate
 *
 * To populate all the root level relations
 */
export type WildcardNotation = '*';

/**
 * Union of all possible string representation for populate
 *
 * @example
 * type A = 'image'; // ✅
 * type B = 'image,component'; // ✅
 * type c = '*'; // ✅
 * type D = 'populatableField'; // ✅
 * type E = '<random_string>'; // ❌
 */
export type StringNotation<TSchemaUID extends Common.UID.Schema> =
  | WildcardNotation
  // Populatable keys
  | Utils.Guard.Never<Attribute.GetPopulatableKeys<TSchemaUID>, string>
  // Other string notations
  // Those are not computed as it would break the TS parser for schemas with lots of populatable attributes
  | `${string},${string}`
  | `${string}.${string}`;

/**
 * Array notation for populate
 *
 * @example
 * type A = ['image']; // ✅
 * type B = ['image', 'component']; // ✅
 * type C = ['populatableField']; // ✅
 * type D = ['<random_string>']; // ❌
 */
export type ArrayNotation<TSchemaUID extends Common.UID.Schema> = StringNotation<TSchemaUID>[];

type GetPopulatableKeysWithTarget<TSchemaUID extends Common.UID.Schema> = Extract<
  Attribute.GetPopulatableKeys<TSchemaUID>,
  Attribute.GetKeysWithTarget<TSchemaUID>
>;

type GetPopulatableKeysWithoutTarget<TSchemaUID extends Common.UID.Schema> = Exclude<
  Attribute.GetPopulatableKeys<TSchemaUID>,
  GetPopulatableKeysWithTarget<TSchemaUID>
>;

/**
 * Fragment populate notation for polymorphic attributes
 */
type PopulateFragment<TMaybeTargets extends Common.UID.Schema> = {
  on?: { [TSchemaUID in TMaybeTargets]?: boolean | Params.Read<TSchemaUID> };
};

type PopulateClause<
  TSchemaUID extends Common.UID.Schema,
  TKeys extends Attribute.GetPopulatableKeys<TSchemaUID>
> = {
  [TKey in TKeys]?: boolean | Params.Read<Attribute.GetTarget<TSchemaUID, TKey>>;
};

/**
 * Object notation for populate
 *
 * @example
 * type A = { image: true }; // ✅
 * type B = { image: { fields: ['url', 'provider'] } }; // ✅
 * type C = { populatableField: { populate: { nestedPopulatableField: true } } }; // ✅
 * type D = { dynamic_zone: { on: { comp_A: { fields: ['name', 'price_a'] }, comp_B: { fields: ['name', 'price_b'] } } } }; // ✅
 */
export type ObjectNotation<TSchemaUID extends Common.UID.Schema> = [
  GetPopulatableKeysWithTarget<TSchemaUID>,
  GetPopulatableKeysWithoutTarget<TSchemaUID>
] extends [
  infer TKeysWithTarget extends Attribute.GetPopulatableKeys<TSchemaUID>,
  infer TKeysWithoutTarget extends Attribute.GetPopulatableKeys<TSchemaUID>
]
  ? Utils.Expression.If<
      Utils.Expression.And<
        Common.AreSchemaRegistriesExtended,
        // If TSchemaUID === Common.UID.Schema, then ignore it and move to loose types
        // Note: Currently, this only ignores TSchemaUID when it is equal to Common.UID.Schema, it won't work if Common.UID.(ContentType|Component) is passed as parameter
        Utils.Expression.DoesNotExtends<Common.UID.Schema, TSchemaUID>
      >,
      // Populatable keys with a target
      | Utils.Expression.If<
          Utils.Expression.IsNotNever<TKeysWithTarget>,
          PopulateClause<TSchemaUID, TKeysWithTarget>
        >
      // Populatable keys with either zero or multiple target(s)
      | Utils.Expression.If<
          Utils.Expression.IsNotNever<TKeysWithoutTarget>,
          {
            [TKey in TKeysWithoutTarget]?:
              | boolean
              | PopulateFragment<
                  Utils.Guard.Never<Attribute.GetMorphTargets<TSchemaUID, TKey>, Common.UID.Schema>
                >
              // TODO: V5: Remove root-level nested params for morph data structures and only allow fragments
              | Params.Read<Common.UID.Schema>;
          }
        >,
      // Loose fallback when registries are not extended
      | { [TKey in string]?: boolean | Params.Read<Common.UID.Schema> }
      | {
          [TKey in string]?:
            | boolean
            | PopulateFragment<Common.UID.Schema>
            // TODO: V5: Remove root-level nested params for morph data structures and only allow fragments
            | Params.Read<Common.UID.Schema>;
        }
    >
  : never;

export type Any<TSchemaUID extends Common.UID.Schema> =
  | StringNotation<TSchemaUID>
  | ArrayNotation<TSchemaUID>
  | ObjectNotation<TSchemaUID>;
