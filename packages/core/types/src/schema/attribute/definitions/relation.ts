import type { AttributeNamesByType, Attribute } from '../..';
import type { ContentType } from '../../../data';
import type { Guard, String, Extends, If, Intersect } from '../../../utils';
import type * as UID from '../../../uid';

// TODO: [TS2] Make sure the inference is correct when using extends Relation<infer TRelationKind>
//             (global search)
/**
 * Represents a relation Strapi attribute along with its options
 */
export type Relation<
  TRelationKind extends RelationKind.Any = RelationKind.Any,
  TTargetUID extends UID.ContentType = UID.ContentType,
> =
  | RelationWithTarget<Extract<TRelationKind, RelationKind.WithTarget>, TTargetUID>
  | RelationWithoutTarget<Extract<TRelationKind, RelationKind.WithoutTarget>>;

export type RelationWithTarget<
  TRelationKind extends RelationKind.WithTarget = RelationKind.WithTarget,
  TTargetUID extends UID.ContentType = UID.ContentType,
> = {
  // Bidirectional (oneToOne, oneToMany, manyToOne, manyToMany)
  oneToOne: OneToOne<TTargetUID>;
  oneToMany: OneToMany<TTargetUID>;
  manyToOne: ManyToOne<TTargetUID>;
  manyToMany: ManyToMany<TTargetUID>;

  // Unidirectional (oneWay, manyWay)
  oneWay: OneWay<TTargetUID>;
  manyWay: ManyWay<TTargetUID>;

  // Morph Reference (morphOne, morphMany)
  morphOne: MorphOne<TTargetUID>;
  morphMany: MorphMany<TTargetUID>;
}[TRelationKind];

type RelationWithoutTarget<
  TRelationKind extends RelationKind.WithoutTarget = RelationKind.WithoutTarget,
> = {
  // Morph Owner (morphToOne, morphToMany)
  morphToOne: MorphToOne;
  morphToMany: MorphToMany;
}[TRelationKind];

export type Bidirectional<
  TRelationKind extends RelationKind.BiDirectional = RelationKind.BiDirectional,
  TTargetUID extends UID.ContentType = UID.ContentType,
> = Relation<TRelationKind, TTargetUID>;

export type XWay<
  TRelationKind extends RelationKind.XWay = RelationKind.XWay,
  TTargetUID extends UID.ContentType = UID.ContentType,
> = Relation<TRelationKind, TTargetUID>;

export type MorphReference<
  TRelationKind extends RelationKind.MorphReference = RelationKind.MorphReference,
  TTargetUID extends UID.ContentType = UID.ContentType,
> = Relation<TRelationKind, TTargetUID>;

export type MorphOwner<TRelationKind extends RelationKind.MorphOwner = RelationKind.MorphOwner> =
  Relation<TRelationKind>;

export type RelationOptions = Intersect<
  [
    Attribute.ConfigurableOption,
    Attribute.PrivateOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
    Attribute.RequiredOption,
    { useJoinTable?: boolean },
  ]
>;

export type CommonBidirectionalProperties<TTargetUID extends UID.ContentType = UID.ContentType> = {
  target: TTargetUID;
  inversedBy?: string;
  mappedBy?: string;
};

export type OneToOne<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    CommonBidirectionalProperties<TTargetUID>,
    RelationOptions,
    { relation: 'oneToOne' },
  ]
>;

export type OneToMany<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    CommonBidirectionalProperties<TTargetUID>,
    RelationOptions,
    { relation: 'oneToMany' },
  ]
>;

export type ManyToOne<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    CommonBidirectionalProperties<TTargetUID>,
    RelationOptions,
    { relation: 'manyToOne' },
  ]
>;

export type ManyToMany<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    CommonBidirectionalProperties<TTargetUID>,
    RelationOptions,
    { relation: 'manyToMany' },
  ]
>;

export type XWayCommonProperties<TTargetUID extends UID.ContentType = UID.ContentType> = {
  target: TTargetUID;
};

export type OneWay<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    XWayCommonProperties<TTargetUID>,
    RelationOptions,
    { relation: 'oneWay' },
  ]
>;

export type ManyWay<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    XWayCommonProperties<TTargetUID>,
    RelationOptions,
    { relation: 'manyWay' },
  ]
>;

export type MorphReferenceCommonProperties<TTargetUID extends UID.ContentType = UID.ContentType> = {
  target: TTargetUID;
  morphBy?: Guard.Never<
    AttributeNamesByType<TTargetUID, 'relation', { relation: RelationKind.MorphOwner }>,
    string
  >;
};

export type MorphOne<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    MorphReferenceCommonProperties<TTargetUID>,
    RelationOptions,
    { relation: 'morphOne' },
  ]
>;

export type MorphMany<TTargetUID extends UID.ContentType = UID.ContentType> = Intersect<
  [
    Attribute.OfType<'relation'>,
    MorphReferenceCommonProperties<TTargetUID>,
    RelationOptions,
    { relation: 'morphMany' },
  ]
>;

export type MorphToOne = Intersect<
  [Attribute.OfType<'relation'>, RelationOptions, { relation: 'morphToOne' }]
>;

export type MorphToMany = Intersect<
  [Attribute.OfType<'relation'>, RelationOptions, { relation: 'morphToMany' }]
>;

export type RelationPluralityModifier<TRelationKind extends RelationKind.Any, TValue> = If<
  IsManyRelation<TRelationKind>,
  TValue[],
  TValue
>;

export type IsManyRelation<TRelationKind extends RelationKind.Any> = String.EndsWith<
  TRelationKind,
  'Many'
>;

export type RelationTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Relation<RelationKind.WithTarget, infer TTarget> ? TTarget : never;

export type RelationValue<
  TRelationKind extends RelationKind.Any,
  TTargetUID extends UID.ContentType = never,
> = {
  // Bidirectional (oneToOne, oneToMany, manyToOne, manyToMany)
  oneToOne: ContentType<TTargetUID>;
  oneToMany: ContentType<TTargetUID>[];
  manyToOne: ContentType<TTargetUID>;
  manyToMany: ContentType<TTargetUID>[];

  // Unidirectional (oneWay, manyWay)
  oneWay: ContentType<TTargetUID>;
  manyWay: ContentType<TTargetUID>[];

  // Morph Reference (morphOne, morphMany)
  morphOne: ContentType<TTargetUID>;
  morphMany: ContentType<TTargetUID>[];

  // Morph Owner (morphToOne, morphToMany)
  morphToOne: ContentType;
  morphToMany: ContentType[];
}[TRelationKind];

export type GetRelationValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Relation<RelationKind.WithoutTarget>
    ? RelationValue<TAttribute['relation']>
    : TAttribute extends Relation<RelationKind.WithTarget, UID.ContentType>
      ? RelationValue<TAttribute['relation'], TAttribute['target']>
      : never;

// TODO: [TS2] Maybe try to simplify this, so that it doesn't require a PhD to understand
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace RelationKind {
  type GetOppositePlurality<TPlurality extends RelationKind.Left | RelationKind.Right> = {
    one: 'many';
    One: 'Many';
    many: 'one';
    Many: 'One';
  }[TPlurality];

  export type Plurality = 'one' | 'many';

  export type Left = Lowercase<RelationKind.Plurality>;
  export type Right = Capitalize<RelationKind.Plurality>;

  export type MorphOwner = `morphTo${RelationKind.Right}`;
  export type MorphReference = `morph${RelationKind.Right}`;
  export type Morph = RelationKind.MorphOwner | RelationKind.MorphReference;

  export type XWay = `${RelationKind.Left}Way`;

  export type BiDirectional = `${RelationKind.Left}To${RelationKind.Right}`;
  export type UniDirectional = RelationKind.MorphReference | RelationKind.XWay;

  export type Any = RelationKind.BiDirectional | RelationKind.Morph | RelationKind.XWay;

  export type WithTarget =
    | RelationKind.BiDirectional
    | RelationKind.XWay
    | RelationKind.MorphReference;

  export type WithoutTarget = RelationKind.MorphOwner;

  export type Reverse<TRelationKind extends RelationKind.Any> =
    TRelationKind extends `${infer TLeft extends RelationKind.Left}To${infer TRight extends RelationKind.Right}`
      ? If<
          Extends<Uppercase<TLeft>, Uppercase<TRight>>,
          TRelationKind,
          `${GetOppositePlurality<TLeft>}To${GetOppositePlurality<TRight>}`
        >
      : TRelationKind;
}
