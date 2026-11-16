import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Database } from '..';
import * as errors from '../errors';
import { getActiveAbortSignal } from '../utils/abort';

/**
 * Reproduction for strapi/strapi#28646: once the request that issued a query is gone, the query
 * builder must stop issuing `select`s for it. Written ahead of the implementation: the names used
 * here (`db.runWithAbortSignal(signal, cb)` and `RequestAbortedError`) come from the planned
 * design and are the only things to adjust if the implementation names them differently.
 */

const ITEM_UID = 'api::item.item';

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

const tempDbFile = () =>
  path.join(
    os.tmpdir(),
    `strapi-abort-signal-${process.pid}-${Math.random().toString(36).slice(2)}.db`
  );

const createSqliteDb = (settings: Record<string, unknown> = {}) =>
  new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: tempDbFile() },
      useNullAsDefault: true,
    },
    settings: {
      migrations: { dir: os.tmpdir() },
      cancelQueriesOnClientDisconnect: true,
      ...settings,
    },
    logger: silentLogger,
  });

const abortedSignal = () => {
  const controller = new AbortController();
  controller.abort();
  return controller.signal;
};

describe('abort signal on the query builder (#28646)', () => {
  let db: Database;
  let issued: string[];

  // The planned entry point; reported as a missing behaviour until it exists
  const runWithAbortSignal = <T>(signal: AbortSignal, cb: () => Promise<T> | T): Promise<T> | T => {
    expect(typeof (db as any).runWithAbortSignal, 'db.runWithAbortSignal is not implemented').toBe(
      'function'
    );
    return (db as any).runWithAbortSignal(signal, cb);
  };

  const expectRequestAborted = async (promiseOrFn: unknown) => {
    expect(errors, 'RequestAbortedError is not exported from errors').toHaveProperty(
      'RequestAbortedError'
    );
    const run = async () => (typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn);
    await expect(run()).rejects.toBeInstanceOf((errors as any).RequestAbortedError);
  };

  const items = () => db.queryBuilder(ITEM_UID);
  const selectItems = () => items().select('*').execute();

  beforeEach(async () => {
    db = createSqliteDb();
    await db.init({
      models: [
        {
          uid: ITEM_UID,
          singularName: 'item',
          tableName: 'items',
          attributes: {
            id: { type: 'increments' },
            name: { type: 'string' },
          },
        },
      ],
    });
    await db.connection.schema.createTable('items', (table) => {
      table.increments('id');
      table.string('name');
    });
    await items().insert({ name: 'first' }).execute();

    issued = [];
    db.connection.on('query', (data: { sql?: string }) => {
      issued.push(data.sql ?? '');
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('runs selects normally while the signal is not aborted', async () => {
    const controller = new AbortController();

    const rows = await runWithAbortSignal(controller.signal, () => selectItems());

    expect(rows).toEqual([{ id: 1, name: 'first' }]);
  });

  it('refuses a select with a RequestAbortedError when the signal is already aborted, without querying', async () => {
    await expectRequestAborted(runWithAbortSignal(abortedSignal(), () => selectItems()));

    expect(issued).toEqual([]);
  });

  it('refuses a select issued after the signal aborted later in the same async flow', async () => {
    const controller = new AbortController();

    await expectRequestAborted(
      runWithAbortSignal(controller.signal, async () => {
        await selectItems();
        controller.abort();
        await Promise.resolve();
        return selectItems();
      })
    );

    expect(issued).toHaveLength(1);
  });

  it('refuses a findOne style select (first) too', async () => {
    await expectRequestAborted(
      runWithAbortSignal(abortedSignal(), () => items().select('*').first().execute())
    );
  });

  it('refuses to start a stream when the signal is already aborted', async () => {
    await expectRequestAborted(
      runWithAbortSignal(abortedSignal(), async () => items().select('*').stream())
    );

    expect(issued).toEqual([]);
  });

  it('does not affect selects outside runWithAbortSignal', async () => {
    runWithAbortSignal(abortedSignal(), () => undefined);

    await expect(selectItems()).resolves.toEqual([{ id: 1, name: 'first' }]);
  });

  describe('never aborts writes', () => {
    it('still inserts, updates and deletes with an aborted signal', async () => {
      await runWithAbortSignal(abortedSignal(), async () => {
        await items().insert({ name: 'second' }).execute();
        await items().update({ name: 'renamed' }).where({ name: 'second' }).execute();
        await items().delete().where({ name: 'first' }).execute();
      });

      const rows = await db.connection('items').select('name');
      expect(rows).toEqual([{ name: 'renamed' }]);
    });
  });

  describe('never aborts anything inside a transaction', () => {
    it('still runs selects and writes in db.transaction with an aborted signal', async () => {
      const rows = await runWithAbortSignal(abortedSignal(), () =>
        db.transaction(async () => {
          await items().insert({ name: 'in trx' }).execute();
          return selectItems();
        })
      );

      expect(rows).toHaveLength(2);
      expect(await db.connection('items').count({ count: '*' })).toEqual([{ count: 2 }]);
    });

    it('still runs a select bound to an explicit transaction (qb.transacting) with an aborted signal', async () => {
      const trx = await db.connection.transaction();
      try {
        const rows = await runWithAbortSignal(abortedSignal(), () =>
          items().select('*').transacting(trx).execute()
        );

        expect(rows).toEqual([{ id: 1, name: 'first' }]);
      } finally {
        await trx.rollback();
      }
    });
  });

  describe('work that outlives the request', () => {
    it('runs a commit hook select even though the signal aborted', async () => {
      const controller = new AbortController();
      let hookRows: unknown;

      await runWithAbortSignal(controller.signal, async () => {
        await db.transaction(({ onCommit }) => {
          onCommit(async () => {
            hookRows = await selectItems();
          });
        });
        controller.abort();
      });
      await db.transaction(async () => undefined);
      await vi.waitFor(() => expect(hookRows).toEqual([{ id: 1, name: 'first' }]));
    });

    it('runs a commit hook select when the signal was aborted before the commit', async () => {
      let hookRows: unknown;

      await runWithAbortSignal(abortedSignal(), () =>
        db.transaction(({ onCommit }) => {
          onCommit(async () => {
            hookRows = await selectItems();
          });
        })
      );

      await vi.waitFor(() => expect(hookRows).toEqual([{ id: 1, name: 'first' }]));
    });

    it('does not apply the guard to a select that locks rows (forUpdate)', () => {
      runWithAbortSignal(abortedSignal(), () => {
        expect(getActiveAbortSignal(db, { type: 'select', forUpdate: true })).toBeUndefined();
        expect(getActiveAbortSignal(db, { type: 'select', transaction: {} })).toBeUndefined();
        expect(getActiveAbortSignal(db, { type: 'select' })?.aborted).toBe(true);
      });
    });
  });

  describe.each([
    ['set to false', false],
    ['unset (the default)', undefined],
  ])('settings.cancelQueriesOnClientDisconnect %s', (_label, value) => {
    it('lets selects run after a disconnect', async () => {
      await db.destroy();
      db = createSqliteDb({ cancelQueriesOnClientDisconnect: value });
      await db.init({
        models: [
          {
            uid: ITEM_UID,
            singularName: 'item',
            tableName: 'items',
            attributes: { id: { type: 'increments' }, name: { type: 'string' } },
          },
        ],
      });
      await db.connection.schema.createTable('items', (table) => {
        table.increments('id');
        table.string('name');
      });

      await expect(runWithAbortSignal(abortedSignal(), () => selectItems())).resolves.toEqual([]);
    });
  });
});
