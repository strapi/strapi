import { Writable } from 'stream';
import type { Core } from '@strapi/types';

import { createLinksWriteStream } from '../strategies/restore/links';
import type { ILink, Transaction } from '../../../../../types';

const insert = jest.fn();

jest.mock('../../../queries/link', () => ({
  createLinkQuery: jest.fn(() => () => ({ insert })),
}));

afterEach(() => {
  jest.clearAllMocks();
});

const strapi = {} as unknown as Core.Strapi;

const transaction = {
  attach: jest.fn(async (callback: (trx?: unknown) => unknown) => {
    const trx = {};
    return callback(trx);
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

  test('Should propagate non foreign key errors', async () => {
    const mappings: Record<string, Record<number, number>> = {
      'test.component': { 1: 11 },
      'api::foo.foo': { 100: 200 },
    };
    const mapID = (uid: string, id: number) => mappings[uid]?.[id];
    const onWarning = jest.fn();

    insert.mockRejectedValueOnce(new Error('current transaction is aborted'));

    const stream = createLinksWriteStream(mapID, strapi, transaction, onWarning);

    await expect(writeLink(stream, createLink())).rejects.toThrow('current transaction is aborted');
    expect(onWarning).not.toHaveBeenCalled();
  });
});
