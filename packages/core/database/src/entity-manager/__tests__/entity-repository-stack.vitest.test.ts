import { describe, expect, it } from 'vitest';

import { createRepository } from '../entity-repository';
import type { Database } from '../..';

const failsAfterAwait = async (): Promise<never> => {
  await Promise.resolve();
  throw new Error('query failed');
};

// Every entity manager method fails after an await, as a real query would
const fakeDb = () =>
  ({
    entityManager: new Proxy({}, { get: () => failsAfterAwait }),
  }) as unknown as Database;

const wrappers = [
  'findOne',
  'findMany',
  'findWithCount',
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'deleteRelations',
  'populate',
  'load',
] as const;

async function callerOfRepository(method: (typeof wrappers)[number]) {
  const repository = createRepository('api::article.article', fakeDb());
  const call = repository[method] as (...args: unknown[]) => Promise<unknown>;
  const result = await call({}, {}, {});
  return result;
}

describe('entity repository stack traces', () => {
  it.each(wrappers)('%s keeps its own frame in the async stack', async (method) => {
    const error = (await callerOfRepository(method).catch((e: Error) => e)) as Error;

    expect(error.message).toBe('query failed');
    expect(error.stack).toContain('entity-repository.ts');
    expect(error.stack).toContain('callerOfRepository');
  });
});
