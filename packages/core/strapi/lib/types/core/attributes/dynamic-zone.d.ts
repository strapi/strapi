import { SchemaUID, GetArrayValues } from '../../utils';
import { ComponentUIDs } from '../schemas';
import { Attribute, ConfigurableOption, MinMaxOption, RequiredOption } from './base';
import { GetAttributesValues } from './utils';

export interface DynamicZoneAttributeProperties<T extends ComponentUIDs[] = []> {
  components: T;
}

export type DynamicZoneAttribute<T extends ComponentUIDs[] = []> = Attribute<'dynamiczone'> &
  // Properties
  DynamicZoneAttributeProperties<T> &
  // Options
  ConfigurableOption &
  MinMaxOption &
  RequiredOption;

type DynamicZoneValue<T extends ComponentUIDs[]> = Array<
  GetArrayValues<T> extends infer P
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
