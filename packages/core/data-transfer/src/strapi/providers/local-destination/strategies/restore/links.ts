import { Writable } from 'stream';
import { ProviderTransferError } from '../../../../../errors/providers';
import { ILink, Transaction } from '../../../../../../types';
import { createLinkQuery } from '../../../../queries/link';

export const createLinksWriteStream = (
  mapID: (uid: string, id: number) => number | undefined,
  strapi: Strapi.Strapi,
  transaction?: Transaction
) => {
  return new Writable({
    objectMode: true,
    async write(link: ILink, _encoding, callback) {
      await transaction?.attach(async (trx) => {
        const { left, right } = link;
        const query = createLinkQuery(strapi, trx);

        // Map IDs if needed
        left.ref = mapID(left.type, left.ref) ?? left.ref;
        right.ref = mapID(right.type, right.ref) ?? right.ref;

        try {
          await query().insert(link);
        } catch (e) {
          if (e instanceof Error) {
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
