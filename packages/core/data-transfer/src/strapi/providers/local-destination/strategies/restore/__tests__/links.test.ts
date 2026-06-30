import type { Knex } from 'knex';
import type { Core } from '@strapi/types';

import type { ILink } from '../../../../../../../types';
import { createLinksWriteStream } from '../links';

const insert = jest.fn();

jest.mock('../../../../../queries/link', () => ({
  createLinkQuery: jest.fn(() => () => ({ insert })),
}));

const link: ILink = {
  kind: 'relation.basic',
  relation: 'oneToMany',
  left: { type: 'api::chapter.chapter', ref: 226, field: 'nodes' },
  right: { type: 'api::node.node', ref: 269, field: 'chapters' },
};

const createPostgresLikeTrx = () => {
  let aborted = false;

  const trx = {
    raw: jest.fn(async (sql: string) => {
      if (aborted && !sql.startsWith('ROLLBACK TO SAVEPOINT')) {
        const error = new Error(
          'current transaction is aborted, commands ignored until end of transaction block'
        ) as Error & { code: string };
        error.code = '25P02';
        throw error;
      }

      if (sql.startsWith('ROLLBACK TO SAVEPOINT')) {
        aborted = false;
      }

      return { rows: [] };
    }),
    transacting: jest.fn().mockReturnThis(),
  } as unknown as Knex.Transaction;

  return {
    trx,
    markAborted() {
      aborted = true;
    },
  };
};

describe('createLinksWriteStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('skips links when either side has no entity ID mapping', async () => {
    const warnings: string[] = [];
    const mapID = jest.fn().mockReturnValue(undefined);

    const transaction = {
      attach: async (callback: () => Promise<void>) => callback(),
    };

    const stream = createLinksWriteStream(mapID, {} as Core.Strapi, transaction, (message) =>
      warnings.push(message)
    );

    await new Promise<void>((resolve, reject) => {
      stream.write(link, (error) => {
        if (error) {
          reject(error);
          return;
        }
        stream.end(resolve);
      });
    });

    expect(insert).not.toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('was not transferred during the entities stage');
  });

  test('continues inserting links after a foreign key failure in the same transaction', async () => {
    const { trx, markAborted } = createPostgresLikeTrx();
    const warnings: string[] = [];

    const fkError = new Error('insert violates foreign key constraint') as Error & { code: string };
    fkError.code = '23503';

    insert
      .mockImplementationOnce(async () => {
        markAborted();
        throw fkError;
      })
      .mockResolvedValueOnce(undefined);

    const mapID = jest.fn((_uid: string, id: number) => id + 1000);

    const transaction = {
      attach: async (callback: (trx: Knex.Transaction) => Promise<void>) => callback(trx),
    };

    const stream = createLinksWriteStream(mapID, {} as Core.Strapi, transaction, (message) =>
      warnings.push(message)
    );

    const secondLink: ILink = {
      ...link,
      left: { ...link.left, ref: 227 },
      right: { ...link.right, ref: 270 },
    };

    await new Promise<void>((resolve, reject) => {
      stream.write(link, (firstError) => {
        if (firstError) {
          reject(firstError);
          return;
        }

        stream.write(secondLink, (secondError) => {
          if (secondError) {
            reject(secondError);
            return;
          }

          stream.end(resolve);
        });
      });
    });

    expect(insert).toHaveBeenCalledTimes(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('foreign key constraint');
    expect(trx.raw).toHaveBeenCalledWith(expect.stringMatching(/^SAVEPOINT /));
    expect(trx.raw).toHaveBeenCalledWith(expect.stringMatching(/^ROLLBACK TO SAVEPOINT /));
  });
});
