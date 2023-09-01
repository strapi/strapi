import type { Common, Attribute, Utils } from '@strapi/strapi';

export interface ComponentProperties<
  TComponentUID extends Common.UID.Component,
  TRepeatable extends Utils.Expression.BooleanValue = Utils.Expression.False
> {
  component: TComponentUID;
  repeatable?: TRepeatable;
}

export type Component<
  TComponentUID extends Common.UID.Component = Common.UID.Component,
  TRepeatable extends Utils.Expression.BooleanValue = Utils.Expression.False
> = Attribute.OfType<'component'> &
  // Component Properties
  ComponentProperties<TComponentUID, TRepeatable> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.MinMaxOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type ComponentValue<
  TComponentUID extends Common.UID.Component,
  TRepeatable extends Utils.Expression.BooleanValue
> = Attribute.GetValues<TComponentUID> extends infer TValues
  ? Utils.Expression.If<TRepeatable, TValues[], TValues>
  : never;

export type GetComponentValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Component<infer TComponentUID, infer TRepeatable>
    ? ComponentValue<TComponentUID, TRepeatable>
    : never;

export type GetComponentTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Component<infer TComponentUID, infer _TRepeatable> ? TComponentUID : never;
