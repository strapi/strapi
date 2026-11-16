import type { UID, Modules } from '@strapi/types';

export type RepositoryFactoryMethod = <TContentTypeUID extends UID.ContentType>(
  uid: TContentTypeUID,
  entityValidator: Modules.EntityValidator.EntityValidator
) => Modules.Documents.ServiceInstance<TContentTypeUID>;

export const wrapInTransaction = (fn: (...args: any) => any) => {
  return async (...args: any[]) => await strapi.db.transaction?.(() => fn(...args));
};

/**
 * Wraps a write that runs several queries (publish deletes the published version, then creates
 * the new one). Inside another transaction, a nested `strapi.db.transaction` neither commits nor
 * rolls back, so the write runs in a savepoint: if it throws, its queries are undone even when
 * the caller catches the error and the outer transaction commits.
 */
export const wrapWriteInTransaction = (fn: (...args: any) => any) => {
  return async (...args: any[]) => {
    if (strapi.db.inTransaction() === true) {
      return await strapi.db.savepoint(() => fn(...args));
    }

    return await strapi.db.transaction(() => fn(...args));
  };
};
