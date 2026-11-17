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
 *
 * The savepoint covers this repository method only. Writes a document middleware makes after it
 * (i18n locale sync, custom-order position sync) are not undone.
 *
 * Rolling back to the savepoint undoes every query run on the transaction since it was created,
 * including those of other calls running concurrently on the same transaction: with
 * `Promise.allSettled([publish(a), update(b)])`, a failed publish also undoes the update, whose
 * promise resolved. Run the writes of one transaction one after another.
 */
export const wrapWriteInTransaction = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
) => {
  return async (...args: TArgs): Promise<TReturn> => {
    if (strapi.db.inTransaction() === true) {
      return await strapi.db.savepoint(() => fn(...args));
    }

    return await strapi.db.transaction(() => fn(...args));
  };
};
