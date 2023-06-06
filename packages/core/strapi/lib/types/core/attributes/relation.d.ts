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
  TOrigin extends Common.UID.Schema,
  TRelationType extends BasicRelationType,
  TTarget extends Common.UID.Schema
> = {
  relation: TRelationType;
  target: TTarget;
} & TRelationType extends Utils.String.Suffix<'morph', 'One' | 'Many'>
  ? {
      morphBy?: Utils.Object.KeysBy<
        Common.Schemas[TTarget]['attributes'],
        Attribute.Relation<Common.UID.Schema, Attribute.PolymorphicRelationType>
      >;
    }
  : {
      inversedBy?: RelationsKeysFromTo<TTarget, TOrigin>;
      mappedBy?: RelationsKeysFromTo<TTarget, TOrigin>;
    };

export interface PolymorphicRelationProperties<TRelationType extends PolymorphicRelationType> {
  relation: TRelationType;
}

export type Relation<
  TOrigin extends Common.UID.Schema = Common.UID.Schema,
  TRelationType extends RelationType = RelationType,
  TTarget extends TRelationType extends PolymorphicRelationType ? never : Common.UID.Schema = never
> = Attribute.OfType<'relation'> &
  // Properties
  (TRelationType extends BasicRelationType
    ? BasicRelationProperties<TOrigin, TRelationType, TTarget>
    : TRelationType extends PolymorphicRelationType
    ? PolymorphicRelationProperties<TRelationType>
    : {}) &
  // Options
  Attribute.ConfigurableOption &
  Attribute.PrivateOption;

export type RelationsKeysFromTo<
  TTarget extends Common.UID.Schema,
  TOrigin extends Common.UID.Schema
> = keyof PickRelationsFromTo<TTarget, TOrigin>;

export type PickRelationsFromTo<
  TTarget extends Common.UID.Schema,
  TOrigin extends Common.UID.Schema
> = Attribute.GetByType<TTarget, 'relation', { target: TOrigin }>;

export type RelationPluralityModifier<
  TRelationType extends RelationType,
  TValue
> = TRelationType extends Utils.String.Suffix<string, 'Many'> ? TValue[] : TValue;

export type RelationValue<
  TRelationType extends RelationType,
  TTarget extends Common.UID.Schema
> = RelationPluralityModifier<TRelationType, Attribute.GetValues<TTarget>>;

export type GetRelationValue<TAttribute extends Attribute.Attribute> = TAttribute extends Relation<
  infer _TOrigin,
  infer TRelationType,
  infer TTarget
>
  ? RelationValue<TRelationType, TTarget>
  : never;
