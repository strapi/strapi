import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import crypto from 'crypto';
import { createStrapiMock } from '../../../tests/utils';

import { isUsernameTaken, findValidUsername } from '../index';

// Mock crypto to control randomInt and randomUUID outputs
vi.spyOn(crypto, 'randomInt');
vi.spyOn(crypto, 'randomUUID');

const makeQueryMock = (findOneFn: Mock) => ({
  db: {
    query: vi.fn().mockReturnValue({ findOne: findOneFn }),
  },
  getModel: vi.fn().mockReturnValue({
    attributes: { username: { minLength: 3 } },
  }),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isUsernameTaken', () => {
  it('returns false when username is not found', async () => {
    const strapi = createStrapiMock(makeQueryMock(vi.fn().mockResolvedValue(null)));

    const result = await isUsernameTaken(strapi, 'joe');

    expect(result).toBe(false);
    expect(strapi.db.query).toHaveBeenCalledWith('plugin::users-permissions.user');
  });

  it('returns true when username is found', async () => {
    const strapi = createStrapiMock(
      makeQueryMock(vi.fn().mockResolvedValue({ id: 1, username: 'joe' }))
    );

    const result = await isUsernameTaken(strapi, 'joe');

    expect(result).toBe(true);
  });
});

describe('findValidUsername', () => {
  it('returns basename when available and meets minLength', async () => {
    const strapi = createStrapiMock(makeQueryMock(vi.fn().mockResolvedValue(null)));

    const result = await findValidUsername(strapi, 'joe');

    expect(result).toBe('joe');
  });

  it('returns suffixed username when basename is taken', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({ id: 1, username: 'joe' }) // basename taken
      .mockResolvedValueOnce(null); // joe1234 available

    const strapi = createStrapiMock(makeQueryMock(findOne));
    vi.mocked(crypto.randomInt).mockImplementation(() => 1234);

    const result = await findValidUsername(strapi, 'joe');

    expect(result).toBe('joe1234');
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('skips basename and appends suffix when basename is shorter than minLength', async () => {
    const strapi = createStrapiMock(makeQueryMock(vi.fn().mockResolvedValue(null)));
    vi.mocked(crypto.randomInt).mockImplementation(() => 5678);

    const result = await findValidUsername(strapi, 'jo'); // length 2 < minLength 3

    // Should not try 'jo' first; goes straight to 'jo5678'
    expect(result).toBe('jo5678');
  });

  it('retries on suffix collision and returns next available', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({ id: 1 }) // basename taken
      .mockResolvedValueOnce({ id: 2 }) // first suffix taken
      .mockResolvedValueOnce(null); // second suffix available

    const strapi = createStrapiMock(makeQueryMock(findOne));
    vi.mocked(crypto.randomInt)
      .mockImplementationOnce(() => 1111)
      .mockImplementationOnce(() => 2222);

    const result = await findValidUsername(strapi, 'joe');

    expect(result).toBe('joe2222');
    expect(findOne).toHaveBeenCalledTimes(3);
  });

  it('falls back to UUID when all 10 attempts are taken', async () => {
    // All calls return a taken user
    const findOne = vi.fn().mockResolvedValue({ id: 1 });

    const strapi = createStrapiMock(makeQueryMock(findOne));
    vi.mocked(crypto.randomInt).mockImplementation(() => 1234);
    vi.mocked(crypto.randomUUID).mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    const result = await findValidUsername(strapi, 'joe');

    expect(result).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    // 1 basename attempt + 10 suffix attempts = 11 total
    expect(findOne).toHaveBeenCalledTimes(11);
  });

  it('respects custom minLength from model attributes', async () => {
    const strapi = createStrapiMock({
      db: { query: vi.fn().mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) }) },
      getModel: vi.fn().mockReturnValue({
        attributes: { username: { minLength: 6 } },
      }),
    });
    vi.mocked(crypto.randomInt).mockImplementation(() => 9999);

    // 'joe' length 3 < minLength 6 → skip basename, use suffix
    const result = await findValidUsername(strapi, 'joe');

    expect(result).toBe('joe9999');
  });
});
