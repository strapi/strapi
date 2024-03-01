import type { Struct } from '@strapi/types';

export type RepositoryFactoryMethod<
  TContentType extends Struct.SingleTypeSchema | Struct.CollectionTypeSchema
> = (contentType: TContentType) => any;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
