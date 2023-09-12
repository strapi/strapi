import type { Utils, Attribute, Common } from '@strapi/strapi';

export interface DynamicZoneProperties<TComponentsUID extends Common.UID.Component[]> {
  components: TComponentsUID;
}

export type DynamicZone<TComponentsUID extends Common.UID.Component[] = Common.UID.Component[]> =
  Attribute.OfType<'dynamiczone'> &
    // Properties
    DynamicZoneProperties<TComponentsUID> &
    // Options
    Attribute.ConfigurableOption &
    Attribute.MinMaxOption &
    Attribute.RequiredOption;

type DynamicZoneValue<TComponentsUID extends Common.UID.Component[]> = Array<
  // Extract tuple values to a component uid union type
  Utils.Array.Values<TComponentsUID> extends infer TComponentUID
    ? TComponentUID extends Common.UID.Component
      ? Attribute.GetValues<TComponentUID> & { __component: TComponentUID }
      : never
    : never
>;

export type GetDynamicZoneValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends DynamicZone<infer TComponentsUID> ? DynamicZoneValue<TComponentsUID> : never;

export type GetDynamicZoneTargets<TAttribute extends Attribute.Attribute> =
  TAttribute extends DynamicZone<infer TComponentsUID> ? Utils.Array.Values<TComponentsUID> : never;
