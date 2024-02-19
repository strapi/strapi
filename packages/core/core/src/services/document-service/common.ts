import type { Schema, Documents } from '@strapi/types';

export type RepositoryFactoryOptions = {
  middlewareManager: Documents.Middleware.Manager;
};

export type RepositoryFactoryMethod<
  TContentType extends Schema.SingleType | Schema.CollectionType
> = (contentType: TContentType, options: RepositoryFactoryOptions) => any;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
