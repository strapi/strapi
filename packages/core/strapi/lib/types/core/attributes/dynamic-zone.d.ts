import { SchemaUID, ValuesOf } from '../../utils';
import { Attribute } from './base';
import { GetAttributesValues } from './utils';

export interface DynamicZoneAttribute<T extends Strapi.ComponentUIDs[] = []>
  extends Attribute<'dynamiczone'> {
  components: T;
}

type DynamicZoneValue<T extends Strapi.ComponentUIDs[]> = Array<
  ValuesOf<T> extends infer P
    ? P extends SchemaUID
      ? GetAttributesValues<P> & { __component: P }
      : never
    : never
>;

export type GetDynamicZoneAttributeValue<T extends Attribute> = T extends DynamicZoneAttribute<
  infer U
>
  ? DynamicZoneValue<U>
  : never;
