import { PassThrough, Writable } from 'stream';

import { createLocalStrapiDestinationProvider } from '../../../providers';
import { abortPushTransfer, writeValidatedPushStreamBatch } from '../push';

describe('push handler terminal teardown', () => {
  test('does not write any entity from a mixed protected batch', async () => {
    const writes: unknown[] = [];
    const stream = new Writable({
      objectMode: true,
      write(chunk, _encoding, callback) {
        writes.push(chunk);
        callback();
      },
    });
    const strapi = {
      getModel(uid: string) {
        return {
          uid,
          attributes: uid === 'api::article.article' ? { title: { type: 'string' } } : {},
        };
      },
      db: {
        metadata: {
          get(uid: string) {
            return {
              uid,
              attributes: uid === 'api::article.article' ? { title: { type: 'string' } } : {},
            };
          },
        },
      },
    };
    const stats = { started: 0, finished: 0 };

    await expect(
      writeValidatedPushStreamBatch(
        strapi as never,
        'entities',
        [
          { type: 'api::article.article', id: 1, data: { title: 'allowed first item' } },
          { type: 'admin::user', id: 2, data: {} },
        ] as never,
        stream,
        stats
      )
    ).rejects.toThrow(/admin::user/);

    expect(writes).toEqual([]);
    expect(stats).toEqual({ started: 0, finished: 0 });
  });

  test('does not close an initialized-but-not-bootstrapped local provider', async () => {
    const provider = createLocalStrapiDestinationProvider({
      strategy: 'restore',
      restore: {},
      autoDestroy: false,
      getStrapi: jest.fn(),
    });
    const cleanup = jest.fn();

    await expect(
      abortPushTransfer({
        provider,
        streams: { entities: new Writable({ write: (_chunk, _encoding, callback) => callback() }) },
        assets: { one: { stream: new PassThrough() } },
        cleanup,
      })
    ).resolves.toBeUndefined();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('continues rollback, close, and cleanup when a stream destruction fails', async () => {
    const rollback = jest.fn();
    const close = jest.fn();
    const cleanup = jest.fn();
    const brokenStream = new Writable({ write: (_chunk, _encoding, callback) => callback() });
    jest.spyOn(brokenStream, 'destroy').mockImplementation(() => {
      throw new Error('stream destruction failed');
    });

    await expect(
      abortPushTransfer({
        provider: { strapi: {}, rollback, close } as never,
        streams: { entities: brokenStream },
        assets: {},
        cleanup,
      })
    ).resolves.toBeUndefined();

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
