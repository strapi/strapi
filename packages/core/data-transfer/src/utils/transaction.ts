import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { Core } from '@strapi/types';

import { Transaction, TransactionCallback } from '../types/utils';

export const createTransaction = (strapi: Core.Strapi): Transaction => {
  const fns: { fn: TransactionCallback; uuid: string }[] = [];

  let done = false;
  let started = false;
  let failure: unknown;
  let resume: null | (() => void) = null;

  const e = new EventEmitter();

  const failPending = (error: unknown) => {
    if (failure) {
      return;
    }

    failure = error;
    done = true;

    const queued = fns.splice(0, fns.length);
    for (const item of queued) {
      e.emit(item.uuid, { error });
    }

    if (!started) {
      e.emit('rollback_failed');
    }

    resume?.();
  };

  e.on('spawn', (uuid, cb) => {
    if (failure) {
      e.emit(uuid, { error: failure });
      return;
    }

    fns.push({ fn: cb, uuid });
    resume?.();
  });

  e.on('close', () => {
    e.removeAllListeners('rollback');
    e.removeAllListeners('spawn');

    done = true;
    resume?.();
  });

  const settled = strapi.db.transaction(async ({ trx, rollback }) => {
    started = true;

    e.once('rollback', async () => {
      e.removeAllListeners('close');
      e.removeAllListeners('spawn');

      try {
        await rollback();
        e.emit('rollback_completed');
      } catch {
        e.emit('rollback_failed');
      } finally {
        done = true;
        resume?.();
      }
    });

    while (!done) {
      while (fns.length) {
        const item = fns.shift();

        if (item) {
          const { fn, uuid } = item;

          try {
            const res = await fn(trx);
            e.emit(uuid, { data: res });
          } catch (error) {
            e.emit(uuid, { error });
          }
        }
      }
      if (!done && !fns.length) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        await new Promise<void>((resolve) => {
          resume = resolve;
        });
      }
    }
  });

  // end() awaits settled. This also rejects attach() when the transaction
  // never starts, instead of leaving that caller waiting on an event.
  settled.catch((error) => {
    failPending(error);
  });

  return {
    async attach<T = undefined>(callback: TransactionCallback): Promise<T | undefined> {
      const uuid = randomUUID();

      return new Promise<T | undefined>((resolve, reject) => {
        e.once(uuid, ({ data, error }) => {
          if (error) {
            reject(error);
            return;
          }

          if (data) {
            resolve(data);
            return;
          }

          resolve(undefined);
        });

        e.emit('spawn', uuid, callback);
      });
    },

    end() {
      // The transfer transaction commits only after this loop exits. Callers
      // that read the database as soon as close() returns must wait for it.
      e.emit('close');
      return Promise.resolve(settled).then(() => undefined);
    },

    rollback() {
      if (failure && !started) {
        return Promise.resolve(false);
      }

      return new Promise<boolean>((resolve) => {
        e.once('rollback_failed', () => resolve(false));
        e.once('rollback_completed', () => resolve(true));
        e.emit('rollback');
      });
    },
  };
};
