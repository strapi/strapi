import type { Common, Attribute } from '@strapi/strapi';

export interface ComponentProperties<
  // Targeted component
  T extends Common.UID.Component,
  // Repeatable
  R extends boolean = false
> {
  component: T;
  repeatable?: R;
}

export type Component<
  // Targeted component
  T extends Common.UID.Component,
  // Repeatable
  R extends boolean = false
> = Attribute.Attribute<'component'> &
  // Component Properties
  ComponentProperties<T, R> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.MinMaxOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type ComponentValue<
  T extends Common.UID.Component,
  R extends boolean
> = Attribute.GetValues<T> extends infer V ? (R extends true ? V[] : V) : never;

export type GetComponentValue<T extends Attribute.Attribute> = T extends Component<infer U, infer R>
  ? ComponentValue<U, R>
  : never;
