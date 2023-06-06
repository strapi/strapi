import type { Utils, Attribute, Common } from '@strapi/strapi';

export interface DynamicZoneProperties<TComponentsUIDs extends Common.UID.Component[]> {
  components: TComponentsUIDs;
}

export type DynamicZone<TComponentsUIDs extends Common.UID.Component[] = Common.UID.Component[]> =
  Attribute.OfType<'dynamiczone'> &
    // Properties
    DynamicZoneProperties<TComponentsUIDs> &
    // Options
    Attribute.ConfigurableOption &
    Attribute.MinMaxOption &
    Attribute.RequiredOption;

type DynamicZoneValue<TComponentsUIDs extends Common.UID.Component[]> = Array<
  // Extract tuple values to a component uid union type
  Utils.Array.Values<TComponentsUIDs> extends infer TComponentUID
    ? TComponentUID extends Common.UID.Component
      ? Attribute.GetValues<TComponentUID> & { __component: TComponentUID }
      : never
    : never
>;

export type GetDynamicZoneValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends DynamicZone<infer TComponentsUIDs> ? DynamicZoneValue<TComponentsUIDs> : never;
