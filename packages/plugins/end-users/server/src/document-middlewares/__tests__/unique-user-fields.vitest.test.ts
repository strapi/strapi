import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import { uniqueUserFieldsMiddleware } from '../unique-user-fields';

type Where = Record<string, unknown>;
type Row = Record<string, unknown>;

/** `existing` are the users in the database; `findOne` answers a `where` of plain equalities. */
const setup = (existing: Row[] = []) => {
  const findOne = vi.fn(async ({ where }: { where: Where }) => {
    return (
      existing.find((user) =>
        Object.entries(where).every(([key, expected]) => {
          if (expected && typeof expected === 'object' && '$ne' in expected) {
            return user[key] !== (expected as { $ne: unknown }).$ne;
          }

          return user[key] === expected;
        })
      ) ?? null
    );
  });
  const query = vi.fn(() => ({ findOne }));
  const middleware = uniqueUserFieldsMiddleware({ db: { query } } as unknown as Core.Strapi);

  const run = async (ctx: Record<string, unknown>) => {
    const next = vi.fn().mockResolvedValue('result');
    const result = await middleware(ctx as never, next);

    return { next, result };
  };

  return { run, findOne, query, middleware };
};

const alice = { documentId: 'u1', email: 'alice@example.com', username: 'alice' };

describe('unique-user-fields', () => {
  it('lets a user with a free email and username through', async () => {
    const { run } = setup([alice]);

    const { next, result } = await run({
      uid: USER_UID,
      action: 'create',
      params: { data: { email: 'bob@example.com', username: 'bob' } },
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(result).toBe('result');
  });

  it('answers a taken email with a validation error that names the field', async () => {
    const { middleware } = setup([alice]);
    const next = vi.fn();

    await expect(
      middleware(
        {
          uid: USER_UID,
          action: 'create',
          params: { data: { email: 'alice@example.com' } },
        } as never,
        next
      )
    ).rejects.toMatchObject({
      name: 'ValidationError',
      message: 'email is already taken',
      details: {
        errors: [{ path: ['email'], message: 'email is already taken', name: 'ValidationError' }],
      },
    });

    // Never reaches the write: the user is not created
    expect(next).not.toHaveBeenCalled();
  });

  it('answers a taken username too', async () => {
    const { run } = setup([alice]);

    await expect(
      run({
        uid: USER_UID,
        action: 'create',
        params: { data: { email: 'b@x.io', username: 'alice' } },
      })
    ).rejects.toMatchObject({
      message: 'username is already taken',
      details: { errors: [{ path: ['username'] }] },
    });
  });

  it('names both fields when both are taken', async () => {
    const { run } = setup([alice]);

    await expect(
      run({
        uid: USER_UID,
        action: 'create',
        params: { data: { email: 'alice@example.com', username: 'alice' } },
      })
    ).rejects.toMatchObject({
      details: { errors: [{ path: ['email'] }, { path: ['username'] }] },
    });
  });

  it('compares the email the way it is stored: trimmed and in lower case', async () => {
    const { run, findOne } = setup([alice]);

    await expect(
      run({ uid: USER_UID, action: 'create', params: { data: { email: '  Alice@Example.COM ' } } })
    ).rejects.toThrow('email is already taken');

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'alice@example.com' } })
    );
  });

  describe('the username, spelled the way Better Auth spells it: in lower case', () => {
    it('is found whatever the case it is given in', async () => {
      const { run, findOne } = setup([alice]);

      await expect(
        run({
          uid: USER_UID,
          action: 'create',
          params: { data: { email: 'b@x.io', username: 'ALICE' } },
        })
      ).rejects.toMatchObject({
        message: 'username is already taken',
        details: { errors: [{ path: ['username'] }] },
      });

      expect(findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { username: 'alice' } })
      );
    });

    it('is stored in lower case, as Better Auth stores it, so signing in by username finds it', async () => {
      const { run } = setup([alice]);
      const data = { email: 'b@x.io', username: 'Bob_The.Builder' };
      const ctx = { uid: USER_UID, action: 'create', params: { data } };

      const { next } = await run(ctx);

      expect(next).toHaveBeenCalledTimes(1);
      expect(ctx.params.data.username).toBe('bob_the.builder');
      // A copy: the object the caller passed in is theirs
      expect(data.username).toBe('Bob_The.Builder');
      expect(ctx.params.data).not.toBe(data);
    });

    it('is stored in lower case on update and on clone too', async () => {
      for (const action of ['update', 'clone']) {
        const { run } = setup([alice]);
        const ctx = {
          uid: USER_UID,
          action,
          params: { documentId: 'u1', data: { email: 'copy@x.io', username: 'Copy' } },
        };

        // eslint-disable-next-line no-await-in-loop
        await run(ctx);

        expect(ctx.params.data.username, action).toBe('copy');
      }
    });

    it('leaves the data alone when the username is already in lower case, or is not one', async () => {
      const { run } = setup([alice]);

      for (const data of [
        { username: 'bob' },
        { username: null },
        { username: 42 },
        { name: 'B' },
      ]) {
        const ctx = { uid: USER_UID, action: 'create', params: { data } };

        // eslint-disable-next-line no-await-in-loop
        await run(ctx);

        expect(ctx.params.data).toBe(data);
      }
    });

    it('lets a user keep the username it has when it is sent back in another case', async () => {
      const { run } = setup([alice]);

      const { next } = await run({
        uid: USER_UID,
        action: 'update',
        params: { documentId: 'u1', data: { username: 'Alice' } },
      });

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('lets a user keep the email and username it has', async () => {
      const { run } = setup([alice]);

      const { next } = await run({
        uid: USER_UID,
        action: 'update',
        params: { documentId: 'u1', data: { email: 'alice@example.com', username: 'alice' } },
      });

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('refuses the email of another user', async () => {
      const { run } = setup([alice, { documentId: 'u2', email: 'bob@example.com' }]);

      await expect(
        run({
          uid: USER_UID,
          action: 'update',
          params: { documentId: 'u2', data: { email: 'alice@example.com' } },
        })
      ).rejects.toThrow('email is already taken');
    });

    it('asks nothing when the update touches neither field', async () => {
      const { run, query } = setup([alice]);

      const { next } = await run({
        uid: USER_UID,
        action: 'update',
        params: { documentId: 'u1', data: { name: 'Alice B' } },
      });

      expect(query).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('clone', () => {
    it('refuses a clone that would copy the email and username of its source', async () => {
      const { run } = setup([alice]);

      await expect(
        run({ uid: USER_UID, action: 'clone', params: { documentId: 'u1', data: {} } })
      ).rejects.toMatchObject({
        details: { errors: [{ path: ['email'] }, { path: ['username'] }] },
      });
    });

    it('lets a clone through once it is given a new email and username', async () => {
      const { run } = setup([alice]);

      const { next } = await run({
        uid: USER_UID,
        action: 'clone',
        params: { documentId: 'u1', data: { email: 'copy@example.com', username: 'copy' } },
      });

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('checks only what the clone copies when it is given one of the two', async () => {
      const { run } = setup([alice]);

      await expect(
        run({
          uid: USER_UID,
          action: 'clone',
          params: { documentId: 'u1', data: { email: 'copy@example.com' } },
        })
      ).rejects.toMatchObject({ details: { errors: [{ path: ['username'] }] } });
    });
  });

  it('leaves what is not an email or a username for the validators', async () => {
    const { run, query } = setup([alice]);

    for (const data of [{ email: null }, { email: 42 }, { username: null }, { username: '' }, {}]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run({ uid: USER_UID, action: 'create', params: { data } });

      expect(next, JSON.stringify(data)).toHaveBeenCalledTimes(1);
    }

    expect(query).not.toHaveBeenCalled();
  });

  it('leaves the other content types and the other actions alone', async () => {
    const { run, query } = setup([alice]);

    for (const ctx of [
      { uid: 'api::article.article', action: 'create' },
      { uid: USER_UID, action: 'findMany' },
      { uid: USER_UID, action: 'delete' },
      { uid: USER_UID, action: 'publish' },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run({
        ...ctx,
        params: { documentId: 'u1', data: { email: 'alice@example.com', username: 'alice' } },
      });

      expect(next).toHaveBeenCalledTimes(1);
    }

    expect(query).not.toHaveBeenCalled();
  });

  it('copes with a call that has no data', async () => {
    for (const params of [undefined, {}, { data: undefined }, { data: null }]) {
      const { run } = setup([alice]);
      // eslint-disable-next-line no-await-in-loop
      const { next } = await run({ uid: USER_UID, action: 'create', params });

      expect(next).toHaveBeenCalledTimes(1);
    }
  });
});
