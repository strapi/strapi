import type { Common, Attribute } from '@strapi/strapi';

export interface ComponentProperties<
  TComponentUID extends Common.UID.Component,
  TRepeatable extends boolean = false
> {
  component: TComponentUID;
  repeatable?: TRepeatable;
}

export type Component<
  TComponentUID extends Common.UID.Component = Common.UID.Component,
  TRepeatable extends boolean = false
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
  TRepeatable extends boolean
> = Attribute.GetValues<TComponentUID> extends infer TValues
  ? TRepeatable extends true
    ? TValues[]
    : TValues
  : never;

export type GetComponentValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Component<infer TComponentUID, infer TRepeatable>
    ? ComponentValue<TComponentUID, TRepeatable>
    : never;
