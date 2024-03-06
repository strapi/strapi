import type { UID, Modules } from '@strapi/types';

export type RepositoryFactoryMethod = <TCollectionTypeUID extends UID.CollectionType>(uid: TCollectionTypeUID) => Modules.Documents.ServiceInstance<TCollectionTypeUID>;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
