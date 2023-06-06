import type { Attribute, Common, Utils } from '@strapi/strapi';

export type BasicRelationType =
  | 'oneToOne'
  | 'oneToMany'
  | 'manyToOne'
  | 'manyToMany'
  | 'morphOne'
  | 'morphMany';
export type PolymorphicRelationType = 'morphToOne' | 'morphToMany';
export type RelationType = BasicRelationType | PolymorphicRelationType;

export type BasicRelationProperties<
  S extends Common.UID.Schema,
  R extends BasicRelationType,
  T extends Common.UID.Schema
> = {
  relation: R;
  target: T;
} & R extends Utils.String.Suffix<'morph', 'One' | 'Many'>
  ? {
      morphBy?: Utils.Object.KeysBy<
        Common.Schemas[T]['attributes'],
        Attribute.Relation<Common.UID.Schema, Attribute.PolymorphicRelationType>
      >;
    }
  : {
      inversedBy?: RelationsKeysFromTo<T, S>;
      mappedBy?: RelationsKeysFromTo<T, S>;
    };

export interface PolymorphicRelationProperties<R extends PolymorphicRelationType> {
  relation: R;
}

export type Relation<
  S extends Common.UID.Schema = Common.UID.Schema,
  R extends RelationType = RelationType,
  T extends R extends PolymorphicRelationType ? never : Common.UID.Schema = never
> = Attribute.OfType<'relation'> &
  // Properties
  (R extends BasicRelationType
    ? BasicRelationProperties<S, R, T>
    : R extends PolymorphicRelationType
    ? PolymorphicRelationProperties<R>
    : {}) &
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
  TRelation extends RelationType,
  TValue extends Record<string, unknown>
> = TRelation extends `${string}Many` ? TValue[] : TValue;

export type RelationValue<
  TRelation extends RelationType,
  TTarget extends Common.UID.Schema
> = RelationPluralityModifier<TRelation, Attribute.GetValues<TTarget>>;

export type GetRelationValue<T extends Attribute.Attribute> = T extends Relation<
  infer _TSource,
  infer TRelation,
  infer TTarget
>
  ? RelationValue<TRelation, TTarget>
  : never;
