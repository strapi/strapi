import { Writable } from 'stream';
import type { Core } from '@strapi/types';

import {
  createLinksWriteStream,
  formatSkippedLinksRestoreSummary,
} from '../strategies/restore/links';
import type { ILink, Transaction } from '../../../../../types';

const insert = jest.fn();

jest.mock('../../../queries/link', () => ({
  createLinkQuery: jest.fn(() => () => ({ insert })),
}));

afterEach(() => {
  jest.clearAllMocks();
  insert.mockReset();
  insert.mockResolvedValue(undefined);
});

beforeEach(() => {
  insert.mockResolvedValue(undefined);
});

const strapi = {
  db: {
    metadata: {
      get: () => ({ attributes: {} }),
    },
  },
} as unknown as Core.Strapi;

const strapiWithLocalizationsJoinColumn = {
  db: {
    metadata: {
      get: () => ({
        attributes: {
          localizations: {
            type: 'relation',
            joinColumn: {
              name: 'document_id',
              referencedColumn: 'document_id',
            },
          },
        },
      }),
    },
  },
} as unknown as Core.Strapi;

const createTrx = () => ({
  raw: jest.fn().mockResolvedValue({ rows: [] }),
});

const transaction = {
  attach: jest.fn(async (callback: (trx?: unknown) => unknown) => {
    return callback(createTrx());
  }),
  end: jest.fn(),
  rollback: jest.fn(),
} as unknown as Transaction;

const createLink = (): ILink => ({
  kind: 'relation.basic',
  relation: 'oneToOne',
  left: { type: 'test.component', ref: 1, field: 'related' },
  right: { type: 'api::foo.foo', ref: 100 },
});

const writeLink = (stream: Writable, link: ILink) =>
  new Promise<void>((resolve, reject) => {
    // Consume the stream error event to avoid unhandled error failures
    stream.once('error', reject);
    stream.write(link, (error) => (error ? reject(error) : resolve()));
  });

const finishStream = (stream: Writable) =>
  new Promise<void>((resolve, reject) => {
    stream.once('error', reject);
    stream.end((error) => (error ? reject(error) : resolve()));
  });

describe('formatSkippedLinksRestoreSummary', () => {
  test('returns null when no links were skipped', () => {
    expect(formatSkippedLinksRestoreSummary(0, 0)).toBeNull();
  });

  test('summarizes unmapped and foreign key skips', () => {
    expect(formatSkippedLinksRestoreSummary(2, 1)).toBe(
      'Links restore skipped 3 relation(s) (2 unmapped, 1 foreign key). Verify relations in the admin after transfer.'
    );
  });
});

describe('createLinksWriteStream', () => {
  test('Should insert the link with both refs mapped', async () => {
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 1: 11 },
      'api::foo.foo': { 100: 200 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);
    await writeLink(stream, createLink());

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.objectContaining({ ref: 11 }),
        right: expect.objectContaining({ ref: 200 }),
      })
    );
    expect(onWarning).not.toHaveBeenCalled();
  });

  test('Should skip the link and warn when the left side was never transferred', async () => {
    // No mapping for the left side: e.g. an orphaned component that was not
    // attached to any entity and therefore never re-created on the destination
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 2: 22 },
      'api::foo.foo': { 100: 200 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);
    await writeLink(stream, createLink());

    expect(insert).not.toHaveBeenCalled();
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('test.component:1'));
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining('was not transferred during the entities stage')
    );
  });

  test('Should skip the link and warn when the right side was never transferred', async () => {
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 1: 11 },
      'api::foo.foo': { 99: 199 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);
    await writeLink(stream, createLink());

    expect(insert).not.toHaveBeenCalled();
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('api::foo.foo:100'));
  });

  test('Should still skip with a warning when the insert hits a foreign key constraint', async () => {
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 1: 11 },
      'api::foo.foo': { 100: 200 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const fkError = Object.assign(new Error('insert into ... violates foreign key constraint'), {
      code: '23503',
    });
    insert.mockRejectedValueOnce(fkError);

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);
    await writeLink(stream, createLink());

    expect(insert).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('foreign key constraint'));
  });

  test('Should continue inserting links after a foreign key failure in the same transaction', async () => {
    let aborted = false;
    const trx = {
      raw: jest.fn(async (sql: string) => {
        if (aborted && !sql.startsWith('ROLLBACK TO SAVEPOINT')) {
          const error = Object.assign(
            new Error(
              'current transaction is aborted, commands ignored until end of transaction block'
            ),
            { code: '25P02' }
          );
          throw error;
        }

        if (sql.startsWith('ROLLBACK TO SAVEPOINT')) {
          aborted = false;
        }

        return { rows: [] };
      }),
    };

    transaction.attach.mockImplementationOnce(async (callback: (t?: unknown) => unknown) =>
      callback(trx)
    );

    const mappings: Record<string, Record<number, number>> = {
      'api::chapter.chapter': { 226: 1226, 227: 1227 },
      'api::node.node': { 269: 1269, 270: 1270 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const fkError = Object.assign(new Error('insert violates foreign key constraint'), {
      code: '23503',
    });

    insert
      .mockImplementationOnce(async () => {
        aborted = true;
        throw fkError;
      })
      .mockResolvedValueOnce(undefined);

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);

    const firstLink: ILink = {
      kind: 'relation.basic',
      relation: 'oneToMany',
      left: { type: 'api::chapter.chapter', ref: 226, field: 'nodes' },
      right: { type: 'api::node.node', ref: 269, field: 'chapters' },
    };
    const secondLink: ILink = {
      kind: 'relation.basic',
      relation: 'oneToMany',
      left: { type: 'api::chapter.chapter', ref: 227, field: 'nodes' },
      right: { type: 'api::node.node', ref: 270, field: 'chapters' },
    };

    await writeLink(stream, firstLink);
    await writeLink(stream, secondLink);

    expect(insert).toHaveBeenCalledTimes(2);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('foreign key constraint'));
    expect(trx.raw).toHaveBeenCalledWith(expect.stringMatching(/^SAVEPOINT /));
    expect(trx.raw).toHaveBeenCalledWith(expect.stringMatching(/^ROLLBACK TO SAVEPOINT /));
  });

  test('Should skip with a warning when the insert hits an aborted transaction error', async () => {
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 1: 11 },
      'api::foo.foo': { 100: 200 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const abortedError = Object.assign(
      new Error('current transaction is aborted, commands ignored until end of transaction block'),
      { code: '25P02' }
    );
    insert.mockRejectedValueOnce(abortedError);

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);
    await writeLink(stream, createLink());

    expect(insert).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(expect.stringContaining('foreign key constraint'));
  });

  test('Should insert localizations links with mapped row id and unchanged document_id', async () => {
    const documentId = 'kq4sntx4a0kymmdpvwvyblb9';
    const mappings: Record<string, Record<number, number>> = {
      'api::article.article': { 1: 101 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const stream = createLinksWriteStream(
      mapID,
      strapiWithLocalizationsJoinColumn,
      transaction,
      onWarning
    );

    await writeLink(stream, {
      kind: 'relation.circular',
      relation: 'oneToMany',
      left: { type: 'api::article.article', ref: 1, field: 'localizations' },
      right: { type: 'api::article.article', ref: documentId },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        left: expect.objectContaining({ ref: 101 }),
        right: expect.objectContaining({ ref: documentId }),
      })
    );
    expect(onWarning).not.toHaveBeenCalled();
  });

  test('Should propagate non foreign key errors', async () => {
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 1: 11 },
      'api::foo.foo': { 100: 200 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    insert.mockRejectedValueOnce(new Error('connection reset by peer'));

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);

    await expect(writeLink(stream, createLink())).rejects.toThrow('connection reset by peer');
    expect(onWarning).not.toHaveBeenCalled();
  });

  test('Should emit a summary warning when the stream ends after skipped links', async () => {
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 2: 22 },
      'api::foo.foo': { 100: 200 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);
    await writeLink(stream, createLink());
    await finishStream(stream);

    expect(onWarning).toHaveBeenCalledTimes(2);
    expect(onWarning).toHaveBeenLastCalledWith(formatSkippedLinksRestoreSummary(1, 0));
  });
});
