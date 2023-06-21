import type { Attribute, Common, Utils } from '@strapi/strapi';

export type Relation<
  // TODO: TOrigin was originally needed to infer precise attribute literal types by doing a reverse lookup
  // on TTarget -> TOrigin relations. Due to errors because of Attribute.Any [relation] very generic
  // representation, type mismatches were encountered and mappedBy/inversedBy are now regular strings.
  // It is kept to allow for future iterations without breaking the current type API
  TOrigin extends Common.UID.Schema = Common.UID.Schema,
  TRelationKind extends RelationKind.Any = RelationKind.Any,
  TTarget extends Common.UID.Schema = never
> = Attribute.OfType<'relation'> &
  // Properties
  RelationProperties<TOrigin, TRelationKind, TTarget> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.PrivateOption;

export type RelationProperties<
  _TOrigin extends Common.UID.Schema,
  TRelationKind extends RelationKind.Any,
  TTarget extends Common.UID.Schema
> = Utils.Expression.MatchFirst<
  [
    Utils.Expression.Test<
      Utils.Expression.Extends<TRelationKind, RelationKind.BiDirectional>,
      {
        relation: TRelationKind;
        target: TTarget;
        inversedBy?: string;
        mappedBy?: string;
      }
    >,
    Utils.Expression.Test<
      Utils.Expression.Extends<TRelationKind, RelationKind.UniDirectional>,
      { relation: TRelationKind }
    >,
    Utils.Expression.Test<
      Utils.Expression.Extends<TRelationKind, RelationKind.MorphReference>,
      {
        relation: TRelationKind;
        target: TTarget;
        morphBy?: Utils.Guard.Never<
          Attribute.GetKeysByType<TTarget, 'relation', { relation: RelationKind.MorphOwner }>,
          string
        >;
      }
    >
  ]
>;

export type RelationsKeysFromTo<
  TTarget extends Common.UID.Schema,
  TOrigin extends Common.UID.Schema
> = keyof PickRelationsFromTo<TTarget, TOrigin>;

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
  export type UniDirectional = RelationKind.Morph | RelationKind.XWay;

  export type Any = RelationKind.BiDirectional | RelationKind.UniDirectional;

  export type Reverse<TRelationKind extends RelationKind.Any> =
    TRelationKind extends `${infer TLeft extends RelationKind.Left}To${infer TRight extends RelationKind.Right}`
      ? Utils.Expression.If<
          Utils.Expression.Extends<Uppercase<TLeft>, Uppercase<TRight>>,
          TRelationKind,
          `${GetOppositePlurality<TLeft>}To${GetOppositePlurality<TRight>}`
        >
      : TRelationKind;
}
