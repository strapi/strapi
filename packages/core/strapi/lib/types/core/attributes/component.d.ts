import { Attribute } from './base';
import { GetAttributesValues } from './utils';

export interface ComponentAttribute<T extends Strapi.ComponentUIDs, R extends boolean = false>
  extends Attribute<'component'> {
  component: T;
  repeatable?: R;
}

export type ComponentValue<T extends Strapi.ComponentUIDs, R extends boolean> = GetAttributesValues<
  T
> extends infer V
  ? R extends true
    ? V[]
    : V
  : never;

export type GetComponentAttributeValue<T extends Attribute> = T extends ComponentAttribute<
  infer U,
  infer R
>
  ? ComponentValue<U, R>
  : never;
