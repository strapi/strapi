import type { Internal } from '@strapi/types';

export type RepositoryFactoryMethod<
  TContentType extends Internal.Struct.SingleTypeSchema | Internal.Struct.CollectionTypeSchema
> = (contentType: TContentType) => any;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
