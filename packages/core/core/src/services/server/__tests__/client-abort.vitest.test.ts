import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import { runWithClientAbortSignal } from '../client-abort';

const createCtx = (writableEnded = false) => {
  const res = Object.assign(new EventEmitter(), { writableEnded });
  return { ctx: { res } as unknown as Context, res };
};

const createStrapi = () => {
  const signals: AbortSignal[] = [];
  const strapi = {
    db: {
      runWithAbortSignal: vi.fn((signal: AbortSignal, cb: () => unknown) => {
        signals.push(signal);
        return cb();
      }),
    },
  } as unknown as Core.Strapi;

  return { strapi, signals };
};

describe('runWithClientAbortSignal', () => {
  it('aborts the signal when the response closes before it ended', async () => {
    const { strapi, signals } = createStrapi();
    const { ctx, res } = createCtx();

    await runWithClientAbortSignal(strapi, ctx, async () => {
      expect(signals[0].aborted).toBe(false);
      res.emit('close');
      expect(signals[0].aborted).toBe(true);
    });
  });

  it('does not abort when the response already ended', async () => {
    const { strapi, signals } = createStrapi();
    const { ctx, res } = createCtx(true);

    await runWithClientAbortSignal(strapi, ctx, async () => {
      res.emit('close');
    });

    expect(signals[0].aborted).toBe(false);
  });

  it('removes its listener once the request is done, also when it throws', async () => {
    const { strapi } = createStrapi();
    const { ctx, res } = createCtx();

    await runWithClientAbortSignal(strapi, ctx, async () => undefined);
    expect(res.listenerCount('close')).toBe(0);

    await expect(
      runWithClientAbortSignal(strapi, ctx, async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(res.listenerCount('close')).toBe(0);
  });

  it('just runs the request when the database is unavailable', async () => {
    const { ctx } = createCtx();

    await expect(
      runWithClientAbortSignal({} as unknown as Core.Strapi, ctx, async () => 'ok')
    ).resolves.toBe('ok');
  });
});
