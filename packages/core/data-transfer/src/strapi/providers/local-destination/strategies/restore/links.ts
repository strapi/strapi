import { Writable } from 'stream';
import type { LoadedStrapi } from '@strapi/types';
import { ProviderTransferError } from '../../../../../errors/providers';
import { ILink, Transaction } from '../../../../../../types';
import { createLinkQuery } from '../../../../queries/link';

export const createLinksWriteStream = (
  mapID: (uid: string, id: number) => number | undefined,
  strapi: LoadedStrapi,
  transaction?: Transaction,
  onWarning?: any
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
            if (e.message.toLowerCase().includes('foreign key constraint')) {
              onWarning(
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
