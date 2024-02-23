import type { Common } from '@strapi/types';

export type RepositoryFactoryMethod = (uid: Common.UID.CollectionType) => any;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
