import { randomUUID } from 'crypto';
import { Writable } from 'stream';
import type { Knex } from 'knex';
import type { Core } from '@strapi/types';
import { ProviderTransferError } from '../../../../../errors/providers';
import { ILink, Transaction } from '../../../../../types';
import { createCappedWarningReporter } from '../../../../../utils/capped-warnings';
import { createLinkQuery } from '../../../../queries/link';
import { resolveLinkRef } from './resolve-link-ref';

interface ErrorWithCode extends Error {
  code: string;
}

const isErrorWithCode = (error: any): error is ErrorWithCode => {
  return error && typeof error.code === 'string';
};

const isForeignKeyConstraintError = (e: Error) => {
  const MYSQL_FK_ERROR_CODES = ['1452', '1557', '1216', '1217', '1451'];
  const POSTGRES_FK_ERROR_CODE = '23503';
  const SQLITE_FK_ERROR_CODE = 'SQLITE_CONSTRAINT_FOREIGNKEY';

  if (isErrorWithCode(e) && e.code) {
    return [SQLITE_FK_ERROR_CODE, POSTGRES_FK_ERROR_CODE, ...MYSQL_FK_ERROR_CODES].includes(e.code);
  }

  return e.message.toLowerCase().includes('foreign key constraint');
};

const isAbortedTransactionError = (e: Error) => {
  return isErrorWithCode(e) && e.code === '25P02';
};

const isPostgresDialect = (strapi: Core.Strapi) => strapi.db?.dialect?.client === 'postgres';

const withSavepoint = async <T>(trx: Knex.Transaction, fn: () => Promise<T>) => {
  const savepoint = `sp_${randomUUID().replace(/-/g, '')}`;

  await trx.raw(`SAVEPOINT ${savepoint}`);

  try {
    const result = await fn();
    await trx.raw(`RELEASE SAVEPOINT ${savepoint}`);
    return result;
  } catch (error) {
    await trx.raw(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    throw error;
  }
};

export const formatSkippedLinksRestoreSummary = (unmapped: number, foreignKey: number) => {
  const total = unmapped + foreignKey;

  if (total === 0) {
    return null;
  }

  const parts = [];

  if (unmapped > 0) {
    parts.push(`${unmapped} unmapped`);
  }

  if (foreignKey > 0) {
    parts.push(`${foreignKey} foreign key`);
  }

  return `Links restore skipped ${total} relation(s) (${parts.join(', ')}). Verify relations in the admin after transfer.`;
};

export const createLinksWriteStream = (
  mapID: (uid: string, id: number) => number | undefined,
  strapi: Core.Strapi,
  transaction?: Transaction,
  onWarning?: (message: string) => void
) => {
  let skippedUnmapped = 0;
  let skippedForeignKey = 0;
  const warnings = createCappedWarningReporter(onWarning);
  // Only PostgreSQL aborts the surrounding transaction on a statement error
  // (25P02). MySQL and SQLite keep the transaction usable after an FK failure,
  // so per-link savepoints are unnecessary there.
  const useSavepoints = isPostgresDialect(strapi);

  return new Writable({
    objectMode: true,
    async write(link: ILink, _encoding, callback) {
      await transaction?.attach(async (trx) => {
        const { left, right } = link;
        const query = createLinkQuery(strapi, trx);

        const originalLeftRef = left.ref;
        const originalRightRef = right.ref;

        const mappedLeftRef = resolveLinkRef(strapi, link, 'left', mapID);
        const mappedRightRef = resolveLinkRef(strapi, link, 'right', mapID);

        // A missing mapping means the referenced row was never transferred
        // during the entities stage (e.g. an orphaned component or a dangling
        // reference in the source database). Falling back to the original ID
        // would either violate a foreign key constraint — which aborts the
        // whole transaction on PostgreSQL — or silently attach the link to an
        // unrelated row, so the link is skipped instead.
        if (mappedLeftRef === undefined || mappedRightRef === undefined) {
          const missingRefs = [
            ...(mappedLeftRef === undefined ? [`${left.type}:${originalLeftRef}`] : []),
            ...(mappedRightRef === undefined ? [`${right.type}:${originalRightRef}`] : []),
          ].join(' and ');

          warnings.warn(
            `Skipping link ${left.type}:${originalLeftRef} -> ${right.type}:${originalRightRef} because ${missingRefs} was not transferred during the entities stage.`
          );

          skippedUnmapped += 1;
          return callback(null);
        }

        left.ref = mappedLeftRef;
        right.ref = mappedRightRef;

        try {
          if (trx && useSavepoints) {
            await withSavepoint(trx, () => query().insert(link));
          } else {
            await query().insert(link);
          }
        } catch (e) {
          if (e instanceof Error) {
            if (isForeignKeyConstraintError(e) || isAbortedTransactionError(e)) {
              warnings.warn(
                `Skipping link ${left.type}:${originalLeftRef} -> ${right.type}:${originalRightRef} due to a foreign key constraint.`
              );
              skippedForeignKey += 1;
              return callback(null);
            }
            return callback(e);
          }

          return callback(
            new ProviderTransferError(
              `An error happened while trying to import a ${left.type} link.`
            )
          );
        }

        callback(null);
      });
    },
    final(callback) {
      const summary = formatSkippedLinksRestoreSummary(skippedUnmapped, skippedForeignKey);

      if (summary) {
        onWarning?.(summary);
      }

      callback();
    },
  });
};
