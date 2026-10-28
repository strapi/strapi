import type { Core } from '@strapi/types';

import Redis from 'ioredis';
import { destroy, register } from '../register';

const mockRedisInstances: { quit: jest.Mock }[] = [];

jest.mock('ioredis', () => {
  const mockConstructor = jest.fn().mockImplementation(() => {
    const instance = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      pexpireat: jest.fn(),
      persist: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
    };
    mockRedisInstances.push(instance);
    return instance;
  });
  return {
    __esModule: true,
    default: mockConstructor,
  };
});

describe('register / destroy', () => {
  beforeEach(() => {
    mockRedisInstances.length = 0;
    jest.clearAllMocks();
  });

  it('registers the redis cache provider factory', () => {
    const registerProvider = jest.fn();
    const strapi = {
      get: jest.fn((name: string) => {
        if (name === 'cacheProviderRegistry') {
          return { register: registerProvider };
        }
        throw new Error(name);
      }),
    } as unknown as Core.Strapi;

    register({ strapi });

    expect(registerProvider).toHaveBeenCalledWith('redis', expect.any(Function));
  });

  it('factory builds a provider using connection options', () => {
    const registerProvider = jest.fn();
    const strapi = {
      get: jest.fn((name: string) => {
        if (name === 'cacheProviderRegistry') {
          return { register: registerProvider };
        }
        throw new Error(name);
      }),
    } as unknown as Core.Strapi;

    register({ strapi });

    const factory = registerProvider.mock.calls[0][1] as (ctx: {
      options?: Record<string, unknown>;
    }) => { get: unknown };

    const provider = factory({
      options: { connection: 'redis://127.0.0.1:6379' },
    });

    expect(Redis).toHaveBeenCalledWith('redis://127.0.0.1:6379');
    expect(provider).toEqual(
      expect.objectContaining({
        get: expect.any(Function),
        set: expect.any(Function),
        delete: expect.any(Function),
      })
    );
  });

  it('destroy quits redis clients created by the factory', async () => {
    const registerProvider = jest.fn();
    const strapi = {
      get: jest.fn((name: string) => {
        if (name === 'cacheProviderRegistry') {
          return { register: registerProvider };
        }
        throw new Error(name);
      }),
    } as unknown as Core.Strapi;

    register({ strapi });

    const factory = registerProvider.mock.calls[0][1] as (ctx: {
      options?: Record<string, unknown>;
    }) => unknown;

    factory({ options: { connection: 'redis://localhost:6379' } });

    expect(mockRedisInstances).toHaveLength(1);

    await destroy({ strapi });

    expect(mockRedisInstances[0].quit).toHaveBeenCalled();
  });
});
