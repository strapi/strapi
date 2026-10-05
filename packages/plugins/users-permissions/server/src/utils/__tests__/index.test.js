/* eslint @typescript-eslint/no-var-requires: off */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const crypto = require('crypto');

// Mock crypto to control randomInt and randomUUID outputs
vi.spyOn(crypto, 'randomInt');
vi.spyOn(crypto, 'randomUUID');

const { isUsernameTaken, findValidUsername } = require('../index');

const makeQueryMock = (findOneFn) => ({
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
    global.strapi = makeQueryMock(vi.fn().mockResolvedValue(null));

    const result = await isUsernameTaken('joe');

    expect(result).toBe(false);
    expect(global.strapi.db.query).toHaveBeenCalledWith('plugin::users-permissions.user');
  });

  it('returns true when username is found', async () => {
    global.strapi = makeQueryMock(vi.fn().mockResolvedValue({ id: 1, username: 'joe' }));

    const result = await isUsernameTaken('joe');

    expect(result).toBe(true);
  });
});

describe('findValidUsername', () => {
  it('returns basename when available and meets minLength', async () => {
    global.strapi = makeQueryMock(vi.fn().mockResolvedValue(null));

    const result = await findValidUsername('joe');

    expect(result).toBe('joe');
  });

  it('returns suffixed username when basename is taken', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({ id: 1, username: 'joe' }) // basename taken
      .mockResolvedValueOnce(null); // joe1234 available

    global.strapi = makeQueryMock(findOne);
    crypto.randomInt.mockReturnValue(1234);

    const result = await findValidUsername('joe');

    expect(result).toBe('joe1234');
    expect(findOne).toHaveBeenCalledTimes(2);
  });

  it('skips basename and appends suffix when basename is shorter than minLength', async () => {
    global.strapi = makeQueryMock(vi.fn().mockResolvedValue(null));
    crypto.randomInt.mockReturnValue(5678);

    const result = await findValidUsername('jo'); // length 2 < minLength 3

    // Should not try 'jo' first; goes straight to 'jo5678'
    expect(result).toBe('jo5678');
  });

  it('retries on suffix collision and returns next available', async () => {
    const findOne = vi
      .fn()
      .mockResolvedValueOnce({ id: 1 }) // basename taken
      .mockResolvedValueOnce({ id: 2 }) // first suffix taken
      .mockResolvedValueOnce(null); // second suffix available

    global.strapi = makeQueryMock(findOne);
    crypto.randomInt.mockReturnValueOnce(1111).mockReturnValueOnce(2222);

    const result = await findValidUsername('joe');

    expect(result).toBe('joe2222');
    expect(findOne).toHaveBeenCalledTimes(3);
  });

  it('falls back to UUID when all 10 attempts are taken', async () => {
    // All calls return a taken user
    const findOne = vi.fn().mockResolvedValue({ id: 1 });

    global.strapi = makeQueryMock(findOne);
    crypto.randomInt.mockReturnValue(1234);
    crypto.randomUUID.mockReturnValue('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');

    const result = await findValidUsername('joe');

    expect(result).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(crypto.randomUUID).toHaveBeenCalledTimes(1);
    // 1 basename attempt + 10 suffix attempts = 11 total
    expect(findOne).toHaveBeenCalledTimes(11);
  });

  it('respects custom minLength from model attributes', async () => {
    global.strapi = {
      db: { query: vi.fn().mockReturnValue({ findOne: vi.fn().mockResolvedValue(null) }) },
      getModel: vi.fn().mockReturnValue({
        attributes: { username: { minLength: 6 } },
      }),
    };
    crypto.randomInt.mockReturnValue(9999);

    // 'joe' length 3 < minLength 6 → skip basename, use suffix
    const result = await findValidUsername('joe');

    expect(result).toBe('joe9999');
  });
});
