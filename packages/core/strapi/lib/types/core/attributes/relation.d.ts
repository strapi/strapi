import type { Attribute, Common, Utils } from '@strapi/strapi';

export type Relation<
  // TODO: TOrigin was originally needed to infer precise attribute literal types by doing a reverse lookup
  // on TTarget -> TOrigin relations. Due to errors because of Attribute.Any [relation] very generic
  // representation, type mismatches were encountered and mappedBy/inversedBy are now regular strings.
  // It is kept to allow for future iterations without breaking the current type API
  _TOrigin extends Common.UID.Schema = Common.UID.Schema,
  TRelationKind extends RelationKind.Any = RelationKind.Any,
  TTarget extends Common.UID.Schema = never
> = Attribute.OfType<'relation'> &
  // Properties
  Utils.Guard.Never<RelationProperties<TRelationKind, TTarget>, AllRelationProperties<TTarget>> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.PrivateOption;

export type RelationProperties<
  TRelationKind extends RelationKind.Any,
  TTarget extends Common.UID.Schema
> = Utils.Expression.MatchFirst<
  [
    [
      Utils.Expression.Extends<TRelationKind, RelationKind.BiDirectional>,
      BiDirectionalProperties<Utils.Cast<TRelationKind, RelationKind.BiDirectional>, TTarget>
    ],
    [
      Utils.Expression.Extends<TRelationKind, RelationKind.XWay>,
      XWayProperties<Utils.Cast<TRelationKind, RelationKind.XWay>, TTarget>
    ],
    [
      Utils.Expression.Extends<TRelationKind, RelationKind.MorphReference>,
      MorphReferenceProperties<Utils.Cast<TRelationKind, RelationKind.MorphReference>, TTarget>
    ],
    [
      Utils.Expression.Extends<TRelationKind, RelationKind.MorphOwner>,
      MorphOwnerProperties<Utils.Cast<TRelationKind, RelationKind.MorphOwner>>
    ]
  ]
>;

export type AllRelationProperties<TTarget extends Common.UID.Schema> =
  | BiDirectionalProperties<RelationKind.BiDirectional, TTarget>
  | XWayProperties<RelationKind.XWay, TTarget>
  | MorphReferenceProperties<RelationKind.MorphReference, TTarget>
  | MorphOwnerProperties<RelationKind.MorphOwner>;

type BiDirectionalProperties<
  TRelationKind extends RelationKind.BiDirectional,
  TTarget extends Common.UID.Schema
> = {
  relation: TRelationKind;
  target: TTarget;
} & Utils.XOR<{ inversedBy?: string }, { mappedBy?: string }>;

type XWayProperties<TRelationKind extends RelationKind.XWay, TTarget extends Common.UID.Schema> = {
  relation: TRelationKind;
  target: TTarget;
};

type MorphReferenceProperties<
  TRelationKind extends RelationKind.MorphReference,
  TTarget extends Common.UID.Schema
> = {
  relation: TRelationKind;
  target: TTarget;
  morphBy?: Utils.Guard.Never<
    Attribute.GetKeysByType<TTarget, 'relation', { relation: RelationKind.MorphOwner }>,
    string
  >;
};

type MorphOwnerProperties<TRelationKind extends RelationKind.MorphOwner> = {
  relation: TRelationKind;
};

export type RelationsKeysFromTo<
  TTarget extends Common.UID.Schema,
  TOrigin extends Common.UID.Schema
> = Utils.Guard.Never<keyof PickRelationsFromTo<TTarget, TOrigin>, string>;

export type PickRelationsFromTo<
  TTarget extends Common.UID.Schema,
  TOrigin extends Common.UID.Schema
> = Attribute.GetByType<TTarget, 'relation', { target: TOrigin }>;

export type RelationPluralityModifier<
  TRelationKind extends RelationKind.Any,
  TValue
> = TRelationKind extends Utils.String.Suffix<string, 'Many'> ? TValue[] : TValue;

export type RelationValue<
  TRelationKind extends RelationKind.Any,
  TTarget extends Common.UID.Schema
> = RelationPluralityModifier<TRelationKind, Attribute.GetValues<TTarget>>;

export type GetRelationValue<TAttribute extends Attribute.Attribute> = TAttribute extends Relation<
  infer _TOrigin,
  infer TRelationKind,
  infer TTarget
>
  ? RelationValue<TRelationKind, TTarget>
  : never;

export type GetRelationTarget<TAttribute extends Attribute.Attribute> = TAttribute extends Relation<
  infer _TOrigin,
  infer _TRelationKind,
  infer TTarget
>
  ? TTarget
  : never;

export module RelationKind {
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
      ? Utils.Expression.If<
          Utils.Expression.Extends<Uppercase<TLeft>, Uppercase<TRight>>,
          TRelationKind,
          `${GetOppositePlurality<TLeft>}To${GetOppositePlurality<TRight>}`
        >
      : TRelationKind;
}
