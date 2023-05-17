import type { Utils, Attribute, Common } from '@strapi/strapi';

export interface DynamicZoneProperties<T extends Common.UID.Component[] = []> {
  components: T;
}

export type DynamicZone<T extends Common.UID.Component[] = Common.UID.Component[]> =
  Attribute.Attribute<'dynamiczone'> &
    // Properties
    DynamicZoneProperties<T> &
    // Options
    Attribute.ConfigurableOption &
    Attribute.MinMaxOption &
    Attribute.RequiredOption;

type DynamicZoneValue<T extends Common.UID.Component[]> = Array<
  Utils.GetArrayValues<T> extends infer P
    ? P extends Common.UID.ContentType
      ? Attribute.GetValues<P> & { __component: P }
      : never
    : never
>;

export type GetDynamicZoneValue<T extends Attribute.Attribute> = T extends DynamicZone<infer U>
  ? DynamicZoneValue<U>
  : never;
