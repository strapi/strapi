import { Writable } from 'stream';
import type { Core } from '@strapi/types';
import { ProviderTransferError } from '../../../../../errors/providers';
import { ILink, Transaction } from '../../../../../../types';
import { createLinkQuery } from '../../../../queries/link';

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

export const createLinksWriteStream = (
  mapID: (uid: string, id: number) => number | undefined,
  strapi: Core.Strapi,
  transaction?: Transaction,
  onWarning?: (message: string) => void
) => {
  return new Writable({
    objectMode: true,
    async write(link: ILink, _encoding, callback) {
      await transaction?.attach(async (trx) => {
        const { left, right } = link;
        const query = createLinkQuery(strapi, trx);

        const originalLeftRef = left.ref;
        const originalRightRef = right.ref;

        // Map IDs if needed
        left.ref = mapID(left.type, originalLeftRef) ?? originalLeftRef;
        right.ref = mapID(right.type, originalRightRef) ?? originalRightRef;

        try {
          await query().insert(link);
        } catch (e) {
          if (e instanceof Error) {
            if (isForeignKeyConstraintError(e)) {
              onWarning?.(
                `Skipping link ${left.type}:${originalLeftRef} -> ${right.type}:${originalRightRef} due to a foreign key constraint.`
              );
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
  });
};
