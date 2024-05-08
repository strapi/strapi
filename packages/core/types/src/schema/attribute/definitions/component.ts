import type * as Data from '../../../data';

import type * as UID from '../../../uid';
import type { Constants, If, Intersect } from '../../../utils';
import type { Attribute } from '../..';

export interface ComponentProperties<
  TComponentUID extends UID.Component,
  TRepeatable extends Constants.BooleanValue = Constants.False,
> {
  component: TComponentUID;
  repeatable?: TRepeatable;
}

/**
 * Represents a component Strapi attribute along with its options
 */
export type Component<
  TComponentUID extends UID.Component = UID.Component,
  TRepeatable extends Constants.BooleanValue = Constants.False,
> = Intersect<
  [
    Attribute.OfType<'component'>,
    // Component Properties
    ComponentProperties<TComponentUID, TRepeatable>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.MinMaxOption,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type ComponentValue<
  TComponentUID extends UID.Component,
  TRepeatable extends Constants.BooleanValue,
> =
  Data.Component<TComponentUID> extends infer TComponentEntry
    ? If<TRepeatable, TComponentEntry[], TComponentEntry>
    : never;

export type GetComponentValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Component<infer TComponentUID, infer TRepeatable>
    ? ComponentValue<TComponentUID, TRepeatable>
    : never;

export type ComponentTarget<TAttribute extends Attribute.Attribute> =
  TAttribute extends Component<infer TComponentUID> ? TComponentUID : never;
