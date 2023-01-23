import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Strapi } from '@strapi/strapi';

type TransactionCallback = (trx?: unknown) => Promise<void>;

export const createTransaction = (strapi: Strapi) => {
  const fns: { fn: TransactionCallback; uuid: string }[] = [];
  let done = false;
  let resume: null | (() => void) = null;

  const e = new EventEmitter();
  e.on('spawn', (uuid, cb) => {
    fns.push({ fn: cb, uuid });
    resume?.();
  });

  e.on('close', () => {
    done = true;
    resume?.();
  });
  strapi.db.transaction(async (trx) => {
    e.on('rollback', async () => {
      await trx.rollback();
    });
    e.on('commit', async () => {
      await trx.commit();
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
      return e.emit('rollback');
    },
  };
};
