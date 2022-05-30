import { Attribute } from './base';
import { GetAttributesValues } from './utils';

export interface ComponentAttribute<T extends Strapi.ComponentUIDs> extends Attribute<'component'> {
  component: T;
  repeatable?: boolean;
}

export type ComponentValue<T extends Strapi.ComponentUIDs> = GetAttributesValues<T>;

export type GetComponentAttributeValue<T extends Attribute> = T extends ComponentAttribute<infer U>
  ? ComponentValue<U>
  : never;
