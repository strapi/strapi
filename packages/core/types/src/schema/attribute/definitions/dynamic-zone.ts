import type * as Data from '../../../data';

import type * as UID from '../../../uid';
import type { Array, Intersect } from '../../../utils';
import type { Attribute } from '../..';

export interface DynamicZoneProperties<TComponentsUID extends UID.Component[]> {
  components: TComponentsUID;
}

/**
 * Represents a dynamic-zone Strapi attribute along with its options
 */
export type DynamicZone<TComponentsUID extends UID.Component[] = UID.Component[]> = Intersect<
  [
    Attribute.OfType<'dynamiczone'>,
    // Properties
    DynamicZoneProperties<TComponentsUID>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.MinMaxOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type DynamicZoneValue<TComponentsUID extends UID.Component[]> = Array<
  // Extract tuple values to a component uid union type
  Array.Values<TComponentsUID> extends infer TComponentUID
    ? TComponentUID extends UID.Component
      ? Intersect<[Data.Component<TComponentUID>, { __component: TComponentUID }]>
      : never
    : never
>;

export type GetDynamicZoneValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends DynamicZone<infer TComponentsUID> ? DynamicZoneValue<TComponentsUID> : never;

export type DynamicZoneTargets<TAttribute extends Attribute.Attribute> =
  TAttribute extends DynamicZone<infer TComponentsUID> ? Array.Values<TComponentsUID> : never;
