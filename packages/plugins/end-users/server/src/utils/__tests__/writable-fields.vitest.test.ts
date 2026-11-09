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
