import type { UID, Modules } from '@strapi/types';

export type RepositoryFactoryMethod = <TContentTypeUID extends UID.ContentType>(
  uid: TContentTypeUID,
  entityValidator: Modules.EntityValidator.EntityValidator
) => Modules.Documents.ServiceInstance<TContentTypeUID>;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return async (...args: any[]) => await strapi.db.transaction?.(() => fn(...args));
};
