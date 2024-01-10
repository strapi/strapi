import type { Utils, Common, UID } from '../..';

export * from './controller';
export * from './middleware';
export * from './policy';
export * from './service';
export * from './router';
export * from './schema';
export * as UID from './uid';
export * from './plugin';
export * from './module';
export * from './api';

export type AreSchemaRegistriesExtended = Utils.Expression.Or<
  IsComponentRegistryExtended,
  IsContentTypeRegistryExtended
>;

export type IsContentTypeRegistryExtended = Utils.Expression.NotStrictEqual<
  UID.ContentType,
  Common.UID.ContentType
>;

export type IsComponentRegistryExtended = Utils.Expression.NotStrictEqual<
  UID.Component,
  Common.UID.Component
>;
