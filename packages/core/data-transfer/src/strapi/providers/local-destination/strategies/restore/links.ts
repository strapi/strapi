import { Writable } from 'stream';
import { ILink } from '../../../../../../types';
import { createLinkQuery } from '../../../../queries/link';

export const createLinksWriteStream = (
  mapID: (uid: string, id: number) => number | undefined,
  strapi: Strapi.Strapi,
  transaction: any
) => {
  return new Writable({
    objectMode: true,
    async write(link: ILink, _encoding, callback) {
      return transaction(async (trx: any) => {
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
            new Error(`An error happened while trying to import a ${left.type} link. ${e}`)
          );
        }

        callback(null);
      });
    },
  });
};
