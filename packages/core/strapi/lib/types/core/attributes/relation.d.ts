import { SchemaUID } from '../../utils';
import { Attribute, ConfigurableOption, PrivateOption } from './base';
import { GetAttributesByType, GetAttributesValues } from './utils';

export type BasicRelationsType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
export type PolymorphicRelationsType =  'morphToOne' | 'morphToMany' | 'morphOne' | 'morphMany';
export type RelationsType = BasicRelationsType | PolymorphicRelationsType;

export interface BasicRelationAttributeProperties<
  S extends SchemaUID,
  R extends RelationsType,
  T extends SchemaUID
> {
  relation: R;
  target: T;
  inversedBy?: RelationsKeysFromTo<T, S>;
  mappedBy?: RelationsKeysFromTo<T, S>;
}

export interface PolymorphicRelationAttributeProperties<
  R extends RelationsType,
> {
  relation: R;
}

export type RelationAttribute<
  S extends SchemaUID,
  R extends RelationsType,
  T extends R extends PolymorphicRelationsType ? never: SchemaUID = never
> = Attribute<'relation'> &
  // Properties
  (R extends BasicRelationsType
    ? BasicRelationAttributeProperties<S, R, T>
    : PolymorphicRelationAttributeProperties<R>) &
  // Options
  ConfigurableOption &
  PrivateOption

export type RelationsKeysFromTo<
  TTarget extends SchemaUID,
  TSource extends SchemaUID
> = keyof PickRelationsFromTo<TTarget, TSource>;

export type PickRelationsFromTo<TTarget extends SchemaUID, TSource extends SchemaUID> = GetAttributesByType<
  TTarget,
  'relation',
  { target: TSource }
>;

export type RelationPluralityModifier<
  TRelation extends RelationsType,
  TValue extends Object
> = TRelation extends `${string}Many` ? TValue[] : TValue;

export type RelationValue<
  TRelation extends RelationsType,
  TTarget extends SchemaUID
> = RelationPluralityModifier<TRelation, GetAttributesValues<TTarget>>;

export type GetRelationAttributeValue<T extends Attribute> = T extends RelationAttribute<
  infer _TSource,
  infer TRelation,
  infer TTarget
>
  ? RelationValue<TRelation, TTarget>
  : never;
