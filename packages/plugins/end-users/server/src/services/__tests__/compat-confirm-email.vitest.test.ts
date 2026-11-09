import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import compatService from '../compat';

const tokenFor = (email: string) =>
  `h.${Buffer.from(JSON.stringify({ email })).toString('base64url')}.s`;

vi.mock('../../compat/login-response', () => ({
  signedInUser: vi.fn(async (_strapi: unknown, documentId: string) => ({ documentId })),
}));

interface Row {
  documentId: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
}

const setup = (row: Row | null, opts: { verifies?: boolean; verifyThrows?: unknown } = {}) => {
  const state = row ? { ...row } : null;
  let queue: Promise<unknown> = Promise.resolve();
  const callNative = vi.fn(async () => {
    if (opts.verifyThrows) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw opts.verifyThrows;
    }

    if (state && opts.verifies !== false) {
      state.emailVerified = true;
    }

    return { headers: new Headers(), response: { status: true, user: undefined } };
  });
  const createSession = vi.fn(async () => ({ token: 'session-token' }));
  const engine = { callNative, createSession };
  const strapi = {
    plugin: () => ({ service: () => ({ get: () => engine }) }),
    db: {
      query: () => ({
        async findOne() {
          const seen = state ? { ...state } : null;

          // The answer arrives later, as it would from a database: the others can read the same state
          await new Promise((resolve) => {
            setTimeout(resolve, 1);
          });

          return seen;
        },
      }),
      // The lock on the user's row, as the database gives it: transactions run one after the other
      queryBuilder() {
        const builder = {
          select: () => builder,
          where: () => builder,
          first: () => builder,
          forUpdate: () => builder,
          execute: async () => undefined,
        };

        return builder;
      },
      transaction(work: () => Promise<unknown>) {
        const turn = queue.then(work, work);

        queue = turn.catch(() => undefined);

        return turn;
      },
    },
  } as unknown as Core.Strapi;

  return { callNative, createSession, service: compatService({ strapi }) };
};

describe('compat service: confirmEmail', () => {
  it('signs in only one of several calls that use the same link at the same moment, the others read the address as confirmed', async () => {
    const { service, createSession } = setup({ documentId: 'u1', emailVerified: false });
    const token = tokenFor('a@example.com');

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => service.confirmEmail(token, {}))
    );

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(createSession).toHaveBeenCalledTimes(1);

    for (const result of results.filter(({ status }) => status === 'rejected')) {
      expect((result as PromiseRejectedResult).reason).toMatchObject({ message: 'Invalid token' });
    }
  });

  it('signs the user in when this call confirmed the address', async () => {
    const { service, createSession } = setup({ documentId: 'u1', emailVerified: false });

    await expect(service.confirmEmail(tokenFor('a@example.com'), {})).resolves.toEqual({
      jwt: 'session-token',
      user: { documentId: 'u1' },
    });
    expect(createSession).toHaveBeenCalledWith('u1', {});
  });

  it('gives Invalid token and no session for an address that was already confirmed', async () => {
    const { service, createSession } = setup({ documentId: 'u1', emailVerified: true });

    await expect(service.confirmEmail(tokenFor('a@example.com'))).rejects.toMatchObject({
      name: 'ApplicationError',
      message: 'Invalid token',
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('never signs in a user the token does not name', async () => {
    const { service, createSession } = setup(null);

    await expect(service.confirmEmail(tokenFor('nobody@example.com'))).rejects.toMatchObject({
      message: 'Invalid token',
    });
    await expect(service.confirmEmail('not-a-token')).rejects.toMatchObject({
      message: 'Invalid token',
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('gives no session when the engine refuses the token', async () => {
    const { service, createSession } = setup(
      { documentId: 'u1', emailVerified: false },
      { verifyThrows: { statusCode: 400, body: { code: 'TOKEN_EXPIRED', message: 'expired' } } }
    );

    await expect(service.confirmEmail(tokenFor('a@example.com'))).rejects.toMatchObject({
      message: 'Invalid token',
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('confirms but gives no session to a user with two-factor enabled: 403 TWO_FACTOR_REQUIRED', async () => {
    const { service, createSession } = setup({
      documentId: 'u1',
      emailVerified: false,
      twoFactorEnabled: true,
    });

    await expect(service.confirmEmail(tokenFor('a@example.com'))).rejects.toMatchObject({
      name: 'ForbiddenError',
      details: { code: 'TWO_FACTOR_REQUIRED' },
    });
    expect(createSession).not.toHaveBeenCalled();
  });
});
