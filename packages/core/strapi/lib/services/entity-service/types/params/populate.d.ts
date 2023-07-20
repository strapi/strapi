import type { Attribute, Common, Utils } from '@strapi/strapi';
import type * as Params from './index';

/**
 * Wildcard notation for populate
 *
 * To populate all the root level relations
 */
type WildcardNotation = '*';

type PopulatableKeys<TSchemaUID extends Common.UID.Schema> = Utils.Guard.Never<
  Attribute.GetPopulatableKeys<TSchemaUID>,
  string
>;

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
type StringNotation<TSchemaUID extends Common.UID.Schema> =
  | WildcardNotation
  | PopulatableKeys<TSchemaUID>
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
type ArrayNotation<TSchemaUID extends Common.UID.Schema> = StringNotation<TSchemaUID>[];

type PopulateDynamicZoneFragments<TSchemaUID extends Common.UID.Schema> = {
  [TKey in Attribute.GetKeysByType<TSchemaUID, 'dynamiczone'>]: {
    on: {
      [TComponentUID in GetComponentsFromDynamicZone<TSchemaUID, TKey>[number]]?:
        | Boolean
        | Params.For<TComponentUID>;
    };
  };
};

type GetComponentsFromDynamicZone<
  TSchemaUID extends Common.UID.Schema,
  TKey extends Attribute.GetKeysByType<TSchemaUID, 'dynamiczone'>
> = Attribute.Get<TSchemaUID, TKey> extends Attribute.DynamicZone<infer TComponentsUIDs>
  ? TComponentsUIDs
  : never;

type ObjectNotation<TSchemaUID extends Common.UID.Schema> =
  | {
      [key in PopulatableKeys<TSchemaUID>]?:
        | Boolean
        | Params.For<
            Attribute.GetTarget<
              TSchemaUID,
              key extends keyof Attribute.GetAll<TSchemaUID> ? key : never
            >
          >;
    }
  | PopulateDynamicZoneFragments<TSchemaUID>;

export type Any<TSchemaUID extends Common.UID.Schema> =
  | StringNotation<TSchemaUID>
  | ArrayNotation<TSchemaUID>
  | ObjectNotation<TSchemaUID>;
