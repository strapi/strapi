import type { UID, Modules } from '@strapi/types';

export type RepositoryFactoryMethod = <TContentTypeUID extends UID.ContentType>(
  uid: TContentTypeUID
) => Modules.Documents.ServiceInstance<TContentTypeUID>;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return (...args: any[]) => strapi.db.transaction?.(() => fn(...args));
};
