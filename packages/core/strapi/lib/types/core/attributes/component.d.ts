import { SchemaUID } from '../../utils';
import { ComponentSchema } from '../schemas';
import { Attribute } from './base';
import { StringAttribute } from './string';
import { GetAttributesValues } from './utils';

export interface ComponentAttribute<T extends Strapi.ComponentUIDs, R extends boolean = false>
  extends Attribute<'component'> {
  component: T;
  repeatable?: R;
  min?: number;
  max?: number;
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
