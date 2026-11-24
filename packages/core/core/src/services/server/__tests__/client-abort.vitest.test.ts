import { EventEmitter } from 'node:events';
import { describe, it, expect, vi } from 'vitest';
import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import {
  armClientAbortSignal,
  isClientDisconnected,
  runWithClientAbortSignal,
} from '../client-abort';

const createCtx = (writableEnded = false, method = 'GET') => {
  const res = Object.assign(new EventEmitter(), { writableEnded });
  return { ctx: { res, method } as unknown as Context, res };
};

const createStrapi = (
  settings: Record<string, unknown> = { abortReadsOnRequestDisconnect: true }
) => {
  const signals: AbortSignal[] = [];
  const strapi = {
    db: {
      config: { settings },
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

  it.each([{ abortReadsOnRequestDisconnect: false }, {}])(
    'adds no listener nor signal when the setting is %j',
    async (settings) => {
      const { strapi } = createStrapi(settings);
      const { ctx, res } = createCtx();

      await runWithClientAbortSignal(strapi, ctx, async () => {
        expect(res.listenerCount('close')).toBe(0);
      });

      expect(strapi.db.runWithAbortSignal).not.toHaveBeenCalled();
    }
  );

  it.each(['GET', 'HEAD'])('arms the signal for %s requests', async (method) => {
    const { strapi } = createStrapi();
    const { ctx } = createCtx(false, method);

    await runWithClientAbortSignal(strapi, ctx, async () => undefined);

    expect(strapi.db.runWithAbortSignal).toHaveBeenCalledTimes(1);
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])(
    'never arms the signal for %s requests, they can write',
    async (method) => {
      const { strapi } = createStrapi();
      const { ctx, res } = createCtx(false, method);

      await runWithClientAbortSignal(strapi, ctx, async () => {
        expect(res.listenerCount('close')).toBe(0);
      });

      expect(strapi.db.runWithAbortSignal).not.toHaveBeenCalled();
    }
  );

  it('just runs the request when the database is unavailable', async () => {
    const { ctx } = createCtx();

    await expect(
      runWithClientAbortSignal({} as unknown as Core.Strapi, ctx, async () => 'ok')
    ).resolves.toBe('ok');
  });
});

describe('armClientAbortSignal', () => {
  it('arms the signal whatever the method, for callers that know the request only reads', async () => {
    const { strapi, signals } = createStrapi();
    const { ctx, res } = createCtx(false, 'POST');

    await armClientAbortSignal(strapi, ctx, async () => {
      res.emit('close');
    });

    expect(signals[0].aborted).toBe(true);
  });

  it('adds nothing when the setting is off', async () => {
    const { strapi } = createStrapi({});
    const { ctx } = createCtx(false, 'POST');

    await armClientAbortSignal(strapi, ctx, async () => undefined);

    expect(strapi.db.runWithAbortSignal).not.toHaveBeenCalled();
  });
});

describe('isClientDisconnected', () => {
  const ctxOf = (res: Record<string, unknown>, socket?: Record<string, unknown>) =>
    ({ res, req: { socket } }) as unknown as Context;

  it('is true when the response was destroyed before it ended', () => {
    expect(isClientDisconnected(ctxOf({ destroyed: true, writableEnded: false }))).toBe(true);
  });

  it('is false while the client is connected, and once the response ended', () => {
    expect(isClientDisconnected(ctxOf({ destroyed: false, writableEnded: false }))).toBe(false);
    expect(isClientDisconnected(ctxOf({ destroyed: true, writableEnded: true }))).toBe(false);
  });
});
