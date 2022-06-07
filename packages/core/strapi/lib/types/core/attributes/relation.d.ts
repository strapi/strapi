import { SchemaUID } from '../../utils';
import { Attribute } from './base';
import { GetAttributesByType, GetAttributesValues } from './utils';

export type BasicRelationsType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
export type PolymorphicRelationsType =  'morphToOne' | 'morphToMany' | 'morphOne' | 'morphMany';
export type RelationsType = BasicRelationsType & PolymorphicRelationsType;

export interface RelationAttribute<
  S extends SchemaUID,
  R extends RelationsType,
  T extends SchemaUID
> extends Attribute<'relation'> {
  relation: R;
  target: T;
  inversedBy?: RelationsKeysFromTo<T, S>;
  mappedBy?: RelationsKeysFromTo<T, S>;
}

interface PolymorphicRelationAttribute<
S extends SchemaUID,
R extends RelationsType,
T extends SchemaUID = never
>  extends Omit<RelationAttribute<S, R, T>, 'target' | 'inversedBy' | 'mappedBy'> {}

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
