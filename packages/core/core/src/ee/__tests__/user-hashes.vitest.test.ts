import crypto from 'crypto';
import { describe, it, expect, vi } from 'vitest';

import { MAX_USER_HASHES, getUserHashes, hashAdminEmail } from '../user-hashes';

const LICENSE_KEY = 'the-license-key';

const expectedHash = (email: string) =>
  crypto.createHmac('sha256', LICENSE_KEY).update(email).digest('hex');

const createStrapi = (findMany: (...args: any[]) => Promise<unknown>) => {
  const warn = vi.fn();
  const query = vi.fn(() => ({ findMany: vi.fn(findMany) }));

  return { strapi: { db: { query }, log: { warn } } as any, query, warn };
};

describe('hashAdminEmail', () => {
  it('is the HMAC-SHA256 of the email keyed with the license key, as lowercase hex', () => {
    const hash = hashAdminEmail(LICENSE_KEY, 'admin@example.com');

    expect(hash).toBe(expectedHash('admin@example.com'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('trims and lowercases the email before hashing', () => {
    expect(hashAdminEmail(LICENSE_KEY, '  Admin@Example.COM \n')).toBe(
      hashAdminEmail(LICENSE_KEY, 'admin@example.com')
    );
  });

  it('depends on the license key', () => {
    expect(hashAdminEmail('another-key', 'admin@example.com')).not.toBe(
      hashAdminEmail(LICENSE_KEY, 'admin@example.com')
    );
  });
});

describe('getUserHashes', () => {
  it('reads only the email of active admin users', async () => {
    const { strapi, query } = createStrapi(async () => []);

    await getUserHashes(strapi, LICENSE_KEY);

    expect(query).toHaveBeenCalledWith('admin::user');
    const findMany = query.mock.results[0].value.findMany;
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: ['email'], where: { isActive: true } })
    );
  });

  it('returns one hash per unique normalized email', async () => {
    const { strapi } = createStrapi(async () => [
      { email: 'a@example.com' },
      { email: 'A@Example.com ' },
      { email: 'b@example.com' },
    ]);

    const hashes = await getUserHashes(strapi, LICENSE_KEY);

    expect(hashes).toEqual([expectedHash('a@example.com'), expectedHash('b@example.com')]);
  });

  it('skips users without a usable email', async () => {
    const { strapi } = createStrapi(async () => [
      { email: null },
      { email: '   ' },
      {},
      { email: 'a@example.com' },
    ]);

    expect(await getUserHashes(strapi, LICENSE_KEY)).toEqual([expectedHash('a@example.com')]);
  });

  it(`caps the list at ${MAX_USER_HASHES} hashes`, async () => {
    const users = Array.from({ length: MAX_USER_HASHES + 5 }, (_, index) => ({
      email: `user-${index}@example.com`,
    }));
    const { strapi } = createStrapi(async () => users);

    const hashes = await getUserHashes(strapi, LICENSE_KEY);

    expect(hashes).toHaveLength(MAX_USER_HASHES);
    expect(hashes?.[0]).toBe(expectedHash('user-0@example.com'));
  });

  it('logs a warning and returns undefined instead of throwing', async () => {
    const { strapi, warn } = createStrapi(async () => {
      throw new Error('db down');
    });

    await expect(getUserHashes(strapi, LICENSE_KEY)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });

  it('does not throw without a database or logger', async () => {
    await expect(getUserHashes({} as any, LICENSE_KEY)).resolves.toBeUndefined();
  });
});
