import type { Schema } from '@strapi/types';

export type RepositoryFactoryMethod<
  TContentType extends Schema.SingleType | Schema.CollectionType
> = (contentType: TContentType) => any;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
