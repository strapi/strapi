import type { Attribute } from '@strapi/strapi';

export type JSON = Attribute.OfType<'json'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.RequiredOption &
  Attribute.PrivateOption;

export type JsonValue<T extends object = object> = T;

export type GetJsonValue<T extends Attribute.Attribute> = T extends JSON ? JsonValue : never;
