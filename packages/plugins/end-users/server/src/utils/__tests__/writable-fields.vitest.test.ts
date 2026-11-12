import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import { readableFields, writableFields } from '../writable-fields';

const strapiWith = (contentTypes: Record<string, unknown>) =>
  ({ contentTypes }) as unknown as Core.Strapi;

describe('writableFields', () => {
  it('leaves out private, non-writable and engine-owned attributes and names a relation once', () => {
    const strapi = strapiWith({
      [USER_UID]: {
        attributes: {
          email: { type: 'email' },
          nickname: { type: 'string' },
          secret: { type: 'string', private: true },
          score: { type: 'integer', writable: false },
          banned: { type: 'boolean' },
          emailVerified: { type: 'boolean' },
          roles: { type: 'relation' },
          company: { type: 'relation' },
          createdBy: { type: 'relation' },
          locale: { type: 'string' },
        },
      },
      'api::note.note': {
        attributes: { banned: { type: 'boolean' }, title: { type: 'string' } },
      },
    });

    expect(writableFields(strapi, USER_UID)).toEqual(['email', 'nickname', 'company']);
    // The engine-owned list is the user type's: another type may have a field of that name
    expect(writableFields(strapi, 'api::note.note')).toEqual(['banned', 'title']);
    expect(writableFields(strapi, 'api::missing.missing')).toEqual([]);
  });
});

describe('the fields a Better Auth plugin marks engine-owned', () => {
  const marked = { pluginOptions: { 'end-users': { engineOwned: true } } };
  const strapi = strapiWith({
    [USER_UID]: {
      attributes: {
        email: { type: 'email' },
        emailVerified: { type: 'boolean' },
        phoneNumberVerified: { type: 'boolean', ...marked },
        isAnonymous: { type: 'boolean', ...marked },
      },
    },
  });

  it('are not written through a role', () => {
    expect(writableFields(strapi, USER_UID)).toEqual(['email']);
  });

  it('are not read through a role, bar the verified email flag', () => {
    expect(readableFields(strapi, USER_UID)).toEqual(['email', 'emailVerified']);
  });
});

describe('readableFields', () => {
  it('leaves out private and system attributes but keeps non-writable ones', () => {
    const strapi = strapiWith({
      'api::note.note': {
        attributes: {
          title: { type: 'string' },
          score: { type: 'integer', writable: false },
          secret: { type: 'string', private: true },
          createdBy: { type: 'relation' },
          publishedAt: { type: 'datetime' },
        },
      },
    });

    expect(readableFields(strapi, 'api::note.note')).toEqual(['title', 'score']);
  });
});

describe('readableFields on the end-user type', () => {
  it('never names the two-factor, session or ban fields, but keeps emailVerified and roles', () => {
    const strapi = strapiWith({
      [USER_UID]: {
        attributes: {
          email: { type: 'email' },
          nickname: { type: 'string' },
          emailVerified: { type: 'boolean' },
          twoFactorEnabled: { type: 'boolean' },
          lastSignInAt: { type: 'datetime' },
          banned: { type: 'boolean' },
          banReason: { type: 'string' },
          banExpires: { type: 'datetime' },
          failedSignIns: { type: 'integer' },
          lockedUntil: { type: 'datetime' },
          roles: { type: 'relation' },
        },
      },
      'api::note.note': {
        attributes: { twoFactorEnabled: { type: 'boolean' }, title: { type: 'string' } },
      },
    });

    expect(readableFields(strapi, USER_UID)).toEqual([
      'email',
      'nickname',
      'emailVerified',
      'roles',
    ]);
    expect(readableFields(strapi, 'api::note.note')).toEqual(['twoFactorEnabled', 'title']);
  });
});
