import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { Core } from '@strapi/types';

import { Transaction, TransactionCallback } from '../../types/utils';

export const createTransaction = (strapi: Core.Strapi): Transaction => {
  const fns: { fn: TransactionCallback; uuid: string }[] = [];

  let done = false;
  let resume: null | (() => void) = null;

  const e = new EventEmitter();
  e.on('spawn', (uuid, cb) => {
    fns.push({ fn: cb, uuid });
    resume?.();
  });

  e.on('close', () => {
    e.removeAllListeners('rollback');
    e.removeAllListeners('spawn');

    done = true;
    resume?.();
  });

  strapi.db.transaction(async ({ trx, rollback }) => {
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

  return {
    async attach<T = undefined>(callback: TransactionCallback): Promise<T | undefined> {
      const uuid = randomUUID();
      e.emit('spawn', uuid, callback);
      return new Promise<T | undefined>((resolve, reject) => {
        e.on(uuid, ({ data, error }) => {
          if (data) {
            resolve(data);
          }

          if (error) {
            reject(error);
          }
          resolve(undefined);
        });
      });
    },

    end() {
      return e.emit('close');
    },

    rollback() {
      return new Promise<boolean>((resolve) => {
        e.emit('rollback');

        e.once('rollback_failed', () => resolve(false));
        e.once('rollback_completed', () => resolve(true));
      });
    },
  };
};
