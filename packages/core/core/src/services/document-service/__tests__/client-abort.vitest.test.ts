import { describe, it, expect, vi } from 'vitest';
import type { Core, Modules } from '@strapi/types';

import { detachWritesFromClientAbort } from '../client-abort';

const createInstance = () => {
  const calls: string[] = [];
  const action = (name: string) =>
    vi.fn(async (params?: unknown) => {
      calls.push(name);
      return { name, params };
    });

  const instance = {
    findMany: action('findMany'),
    findOne: action('findOne'),
    create: action('create'),
    update: action('update'),
    delete: action('delete'),
    clone: action('clone'),
    publish: action('publish'),
    unpublish: action('unpublish'),
    discardDraft: action('discardDraft'),
  } as unknown as Modules.Documents.ServiceInstance;

  return { instance, calls };
};

const createStrapi = () => {
  const detached: unknown[] = [];
  const strapi = {
    db: {
      runWithoutAbortSignal: vi.fn((cb: () => unknown) => {
        const result = cb();
        detached.push(result);
        return result;
      }),
    },
  } as unknown as Core.Strapi;

  return { strapi, detached };
};

describe('detachWritesFromClientAbort', () => {
  it('runs every write action detached from the abort signal, with its arguments and result', async () => {
    const { strapi } = createStrapi();
    const { instance } = createInstance();

    const detachedInstance = detachWritesFromClientAbort(strapi, instance);

    for (const action of [
      'create',
      'update',
      'delete',
      'clone',
      'publish',
      'unpublish',
      'discardDraft',
    ] as const) {
      vi.mocked(strapi.db.runWithoutAbortSignal).mockClear();

      await expect((detachedInstance[action] as any)({ documentId: 'a' })).resolves.toEqual({
        name: action,
        params: { documentId: 'a' },
      });
      expect(strapi.db.runWithoutAbortSignal).toHaveBeenCalledTimes(1);
    }
  });

  it('leaves read actions under the abort signal', async () => {
    const { strapi } = createStrapi();
    const { instance } = createInstance();

    const detachedInstance = detachWritesFromClientAbort(strapi, instance);
    await detachedInstance.findMany({});
    await detachedInstance.findOne({ documentId: 'a' });

    expect(strapi.db.runWithoutAbortSignal).not.toHaveBeenCalled();
  });

  it('skips actions the content type does not have (no draft and publish)', () => {
    const { strapi } = createStrapi();
    const { instance } = createInstance();
    Object.assign(instance, { publish: undefined, unpublish: undefined, discardDraft: undefined });

    const detachedInstance = detachWritesFromClientAbort(strapi, instance);

    expect(detachedInstance.publish).toBeUndefined();
    expect(detachedInstance.unpublish).toBeUndefined();
    expect(detachedInstance.discardDraft).toBeUndefined();
  });

  it('just runs the action when the database is unavailable', async () => {
    const { instance, calls } = createInstance();

    const detachedInstance = detachWritesFromClientAbort({} as Core.Strapi, instance);

    await detachedInstance.create({ data: {} } as any);
    expect(calls).toEqual(['create']);
  });
});
