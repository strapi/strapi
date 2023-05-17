import type { Attribute, Common } from '@strapi/strapi';

export type BasicRelationsType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
export type PolymorphicRelationsType = 'morphToOne' | 'morphToMany' | 'morphOne' | 'morphMany';
export type RelationsType = BasicRelationsType | PolymorphicRelationsType;

export interface BasicRelationProperties<
  S extends Common.UID.Schema,
  R extends RelationsType,
  T extends Common.UID.Schema
> {
  relation: R;
  target: T;
  inversedBy?: RelationsKeysFromTo<T, S>;
  mappedBy?: RelationsKeysFromTo<T, S>;
}

export interface PolymorphicRelationProperties<R extends RelationsType> {
  relation: R;
}

export type Relation<
  S extends Common.UID.Schema,
  R extends RelationsType,
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
