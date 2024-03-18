import type { Common, Documents } from '@strapi/types';

export type RepositoryFactoryMethod = (uid: Common.UID.CollectionType) => Documents.ServiceInstance;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
