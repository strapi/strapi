import { SchemaUID, GetArrayValues } from '../../utils';
import { Attribute } from './base';
import { GetAttributesValues } from './utils';

export interface DynamicZoneAttribute<T extends Strapi.ComponentUIDs[] = []>
  extends Attribute<'dynamiczone'> {
  components: T;
  min?: number;
  max?: number;
}

type DynamicZoneValue<T extends Strapi.ComponentUIDs[]> = Array<
  GetArrayValues<T> extends infer P extends SchemaUID
    ? GetAttributesValues<P> & { __component: P }
    : never
>;

export type GetDynamicZoneAttributeValue<T extends Attribute> = T extends DynamicZoneAttribute<
  infer U
>
  ? DynamicZoneValue<U>
  : never;
