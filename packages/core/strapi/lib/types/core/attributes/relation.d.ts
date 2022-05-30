import { SchemaUID } from '../../utils';
import { Attribute } from './base';
import { GetAttributesByType, GetAttributesValues } from './utils';

export type RelationsType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';

export interface RelationAttribute<
  TSource extends SchemaUID,
  TRelation extends RelationsType,
  TTarget extends SchemaUID
> extends Attribute<'relation'> {
  relation: TRelation;
  target: TTarget;
  inversedBy?: RelationsKeysFromTo<TTarget, TSource>;
  mappedBy?: RelationsKeysFromTo<TTarget, TSource>;
}

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
> = TRelation extends `${string}ToMany` ? TValue[] : TValue;

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
