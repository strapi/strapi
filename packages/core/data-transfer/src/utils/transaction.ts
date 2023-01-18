import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Strapi } from '@strapi/strapi';

export const createTransaction = async (strapi: Strapi) => {
  const fns: { fn: (trx?: any) => Promise<void>; uuid: string }[] = [];
  let done = false;
  let resume = () => {};

  const e = new EventEmitter();
  e.on('spawn', (uuid, cb) => {
    fns.push({ fn: cb, uuid });
    resume();
    return uuid;
  });

  e.on('close', () => {
    done = true;
    resume();
  });
  strapi.db.transaction(async (trx) => {
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
    async transaction<T = undefined>(callback: any): Promise<T | undefined> {
      const uuid = randomUUID();
      e.emit('spawn', uuid, callback);
      return new Promise<T | undefined>((resolve, reject) => {
        e.on(uuid, ({ data, error }) => {
          if (data) {
            resolve(data);
          }

          if (error) {
            reject(data);
          }
          resolve(undefined);
        });
      });
    },
    endTransaction() {
      return e.emit('close');
    },
  };
};
