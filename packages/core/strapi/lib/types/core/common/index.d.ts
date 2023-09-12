import type { Attribute, Common, Utils } from '@strapi/strapi';

export * from './controller';
export * from './service';
export * from './schema';
export * as UID from './uid';

/**
 * Determines if the shared registries for components and content types have been extended or if they're still represented as loose mapped types
 *
 * Here we use the fact that once the registries are extended, Attribute.GetKeys<Common.UID.Schema> will resolve to either never or a more
 * deterministic value rather than string | number which represent the keys of the initial mapped type (Component & ContentType's registries)
 */
export type AreSchemaRegistriesExtended = Utils.Expression.Not<
  Utils.Expression.Extends<string | number, Attribute.GetKeys<Common.UID.Schema>>
>;
