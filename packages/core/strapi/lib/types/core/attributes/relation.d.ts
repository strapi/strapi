import type { Attribute, Common, Utils } from '@strapi/strapi';

export type BasicRelationsType =
  | 'oneToOne'
  | 'oneToMany'
  | 'manyToOne'
  | 'manyToMany'
  | 'morphOne'
  | 'morphMany';
export type PolymorphicRelationsType = 'morphToOne' | 'morphToMany';
export type RelationsType = BasicRelationsType | PolymorphicRelationsType;

export type BasicRelationProperties<
  S extends Common.UID.Schema,
  R extends BasicRelationsType,
  T extends Common.UID.Schema
> = {
  relation: R;
  target: T;
} & R extends `morph${string}`
  ? {
      morphBy?: Utils.KeysBy<
        Common.Schemas[T]['attributes'],
        Attribute.Relation<Common.UID.Schema, Attribute.PolymorphicRelationsType>
      >;
    }
  : {
      inversedBy?: RelationsKeysFromTo<T, S>;
      mappedBy?: RelationsKeysFromTo<T, S>;
    };

export interface PolymorphicRelationProperties<R extends PolymorphicRelationsType> {
  relation: R;
}

export type Relation<
  S extends Common.UID.Schema = Common.UID.Schema,
  R extends RelationsType = RelationsType,
  T extends R extends PolymorphicRelationsType ? never : Common.UID.Schema = never
> = Attribute.Attribute<'relation'> &
  // Properties
  (R extends BasicRelationsType
    ? BasicRelationProperties<S, R, T>
    : PolymorphicRelationProperties<R>) &
  // Options
  Attribute.ConfigurableOption &
  Attribute.PrivateOption;

export type RelationsKeysFromTo<
  TTarget extends Common.UID.Schema,
  TSource extends Common.UID.Schema
> = keyof PickRelationsFromTo<TTarget, TSource>;

export type PickRelationsFromTo<
  TTarget extends Common.UID.Schema,
  TSource extends Common.UID.Schema
> = Attribute.GetByType<TTarget, 'relation', { target: TSource }>;

export type RelationPluralityModifier<
  TRelation extends RelationsType,
  TValue extends Record<string, unknown>
> = TRelation extends `${string}Many` ? TValue[] : TValue;

export type RelationValue<
  TRelation extends RelationsType,
  TTarget extends Common.UID.Schema
> = RelationPluralityModifier<TRelation, Attribute.GetValues<TTarget>>;

export type GetRelationValue<T extends Attribute.Attribute> = T extends Relation<
  infer _TSource,
  infer TRelation,
  infer TTarget
>
  ? RelationValue<TRelation, TTarget>
  : never;
