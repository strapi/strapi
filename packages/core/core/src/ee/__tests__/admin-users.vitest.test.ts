import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { getAdminUsersAcrossInstances } from '../admin-users';

const NOW = '2026-11-13T12:00:00.000Z';
const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.parse(NOW) - hours * HOUR).toISOString();

// Two hours before NOW
const COUNT = { activeUsers: 12, contractedUsers: 10, updatedAt: '2026-11-13T10:00:00.000Z' };

const createStrapi = (get: () => Promise<unknown>) => ({ store: { get: vi.fn(get) } }) as any;

describe('getAdminUsersAcrossInstances', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the count the license check stored', async () => {
    const strapi = createStrapi(async () => COUNT);

    await expect(getAdminUsersAcrossInstances({ strapi })).resolves.toEqual(COUNT);
    expect(strapi.store.get).toHaveBeenCalledWith({
      type: 'ee',
      key: 'admin_users_across_instances',
    });
  });

  it.each([
    ['without a contracted number of users', { ...COUNT, contractedUsers: null }],
    ['sent less than 48 hours ago', { ...COUNT, updatedAt: hoursAgo(47) }],
  ])('returns a count %s', async (_label, count) => {
    const strapi = createStrapi(async () => count);

    await expect(getAdminUsersAcrossInstances({ strapi })).resolves.toEqual(count);
  });

  it('returns only the count fields', async () => {
    const strapi = createStrapi(async () => ({ ...COUNT, extra: 'field' }));

    await expect(getAdminUsersAcrossInstances({ strapi })).resolves.toEqual(COUNT);
  });

  it.each([
    ['nothing is stored', null],
    ['the stored value is malformed', { activeUsers: '12', updatedAt: 1 }],
    ['the stored date is not a date', { ...COUNT, updatedAt: 'yesterday' }],
    ['the registry last answered more than 48 hours ago', { ...COUNT, updatedAt: hoursAgo(49) }],
  ])('is null when %s', async (_label, value) => {
    const strapi = createStrapi(async () => value);

    await expect(getAdminUsersAcrossInstances({ strapi })).resolves.toBeNull();
  });

  it('is null when the store cannot be read', async () => {
    const strapi = createStrapi(async () => {
      throw new Error('db down');
    });

    await expect(getAdminUsersAcrossInstances({ strapi })).resolves.toBeNull();
  });
});
