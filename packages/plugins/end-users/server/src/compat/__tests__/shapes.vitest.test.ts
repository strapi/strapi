import { describe, expect, it } from 'vitest';

import { toUpRole, toUpUser, translateRoleQuery } from '../shapes';

const user = {
  id: 7,
  documentId: 'doc-7',
  email: 'a@example.com',
  username: 'a',
  emailVerified: true,
  banned: false,
  banReason: 'x',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  nickname: 'ay',
};

const role = { id: 3, name: 'Authenticated', description: 'd', type: 'authenticated' as const };

describe('toUpUser', () => {
  it('gives numeric id and documentId, confirmed and blocked from the stored fields, and no private field', () => {
    const shaped = toUpUser(user, {});

    expect(shaped).toMatchObject({
      id: 7,
      documentId: 'doc-7',
      username: 'a',
      provider: 'local',
      confirmed: true,
      blocked: false,
      nickname: 'ay',
    });
    expect(shaped).not.toHaveProperty('emailVerified');
    expect(shaped).not.toHaveProperty('banned');
    expect(shaped).not.toHaveProperty('banReason');
    expect(shaped).not.toHaveProperty('role');
  });

  it('merges the profile and the provider, and never lets a profile field replace a user field', () => {
    const shaped = toUpUser(user, {
      extras: { provider: 'github', profile: { bio: 'hi', email: 'other@example.com' } },
    });

    expect(shaped.provider).toBe('github');
    expect(shaped.bio).toBe('hi');
    expect(shaped.email).toBe('a@example.com');
  });

  it('adds role only when asked', () => {
    expect(toUpUser(user, {})).not.toHaveProperty('role');
    expect(toUpUser(user, { role: null }).role).toBeNull();
    expect(toUpUser(user, { role: toUpRole([role]) }).role).toEqual(role);
  });
});

describe('toUpRole', () => {
  it('takes the first role and returns null for none', () => {
    expect(toUpRole([role, { ...role, id: 4, name: 'Other' }])).toEqual({
      id: 3,
      name: 'Authenticated',
      description: 'd',
      type: 'authenticated',
    });
    expect(toUpRole([])).toBeNull();
  });
});

describe('translateRoleQuery', () => {
  it('maps role to roles in populate, filters and sort and leaves other keys alone', () => {
    expect(
      translateRoleQuery({
        populate: ['role', 'profile'],
        filters: { role: { name: 'x' }, $or: [{ role: { type: 'custom' } }], email: 'e' },
        sort: ['role.name:asc', 'email'],
        pagination: { page: 1 },
      })
    ).toEqual({
      populate: ['roles', 'profile'],
      filters: { roles: { name: 'x' }, $or: [{ roles: { type: 'custom' } }], email: 'e' },
      sort: ['roles.name:asc', 'email'],
      pagination: { page: 1 },
    });

    expect(translateRoleQuery({ populate: 'role,profile', sort: { role: 'asc' } })).toEqual({
      populate: 'roles,profile',
      sort: { roles: 'asc' },
    });
    expect(translateRoleQuery({ populate: { role: { fields: ['name'] } } })).toEqual({
      populate: { roles: { fields: ['name'] } },
    });
    expect(translateRoleQuery({ populate: '*', filters: { roleName: 'x' } })).toEqual({
      populate: '*',
      filters: { roleName: 'x' },
    });
  });
});
