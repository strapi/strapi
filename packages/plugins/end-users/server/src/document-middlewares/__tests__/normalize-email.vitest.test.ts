import { describe, expect, it, vi } from 'vitest';

import { USER_UID } from '../../constants';
import { normalizeEmailMiddleware } from '../normalize-email';

const run = async (ctx: Record<string, unknown>) => {
  const next = vi.fn().mockResolvedValue('result');
  const result = await normalizeEmailMiddleware(ctx as never, next);

  return { result, next };
};

describe('normalize-email', () => {
  it.each(['create', 'update', 'clone'])(
    'trims and lowercases the email on %s of a user',
    async (action) => {
      const ctx = {
        uid: USER_UID,
        action,
        params: { data: { email: '  Alice@Example.COM ', name: 'Alice' } },
      };
      const { next, result } = await run(ctx);

      expect(ctx.params.data).toEqual({ email: 'alice@example.com', name: 'Alice' });
      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    }
  );

  it('leaves the other content types alone', async () => {
    const ctx = {
      uid: 'api::article.article',
      action: 'create',
      params: { data: { email: ' A@B.C ' } },
    };

    await run(ctx);

    expect(ctx.params.data.email).toBe(' A@B.C ');
  });

  it('leaves the other actions alone', async () => {
    for (const action of ['findMany', 'findFirst', 'delete', 'publish', 'count']) {
      const ctx = { uid: USER_UID, action, params: { data: { email: ' A@B.C ' } } };

      await run(ctx);

      expect(ctx.params.data.email, action).toBe(' A@B.C ');
    }
  });

  it('leaves an update that does not touch the email alone', async () => {
    const ctx = {
      uid: USER_UID,
      action: 'update',
      params: { documentId: 'x', data: { name: 'B' } },
    };

    await run(ctx);

    expect(ctx.params.data).toEqual({ name: 'B' });
    expect(ctx.params.data).not.toHaveProperty('email');
  });

  it('leaves an email that is not a string for the validators', async () => {
    for (const email of [undefined, null, 42, ['a@b.c'], { a: 1 }]) {
      const ctx = { uid: USER_UID, action: 'create', params: { data: { email } } };

      await run(ctx);

      expect(ctx.params.data.email).toBe(email);
    }
  });

  it('copes with a call that has no data', async () => {
    for (const params of [undefined, {}, { data: undefined }, { data: null }]) {
      const { next } = await run({ uid: USER_UID, action: 'create', params });

      expect(next).toHaveBeenCalledTimes(1);
    }
  });

  it('does not change the object the caller passed in', async () => {
    const data = { email: ' A@B.C ' };
    const ctx = { uid: USER_UID, action: 'create', params: { data } };

    await run(ctx);

    expect(ctx.params.data).toEqual({ email: 'a@b.c' });
    expect(data.email).toBe(' A@B.C ');
  });
});
