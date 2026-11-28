import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Modules } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../../constants';
import { BUILT_IN_CONDITIONS, isOwner, isSelf, ownerField, relationsToUser } from '../index';
// Core's own functions, from its source: what the permission engine and the checker run a
// condition through. `@strapi/core` exports neither, its package exports only `.` (so the path the
// rule suggests does not resolve), and its built output predates them
/* eslint-disable import/no-relative-packages */
import {
  applyCondition,
  evaluateCondition,
} from '../../../../../../core/core/src/services/content-api/permissions/conditions';
/* eslint-enable import/no-relative-packages */

type ConditionContext = Modules.ContentAPI.ConditionContext;

const NOTE_UID = 'api::note.note';
const FOLDER_UID = 'api::folder.folder';
/** Two relations to the end user: the owner can't be guessed */
const REVIEW_UID = 'api::review.review';

const relation = (target: string, extra: Record<string, unknown> = {}) => ({
  type: 'relation',
  relation: 'manyToOne',
  target,
  ...extra,
});

/** The content types the registry knows, as `strapi.contentType(uid)` gives them */
const SCHEMAS: Record<string, { uid: string; attributes: Record<string, unknown> }> = {
  [NOTE_UID]: {
    uid: NOTE_UID,
    attributes: {
      title: { type: 'string' },
      owner: relation(USER_UID, { relation: 'oneToOne' }),
      folder: relation(FOLDER_UID, { inversedBy: 'notes' }),
    },
  },
  // The profile's `user`: a oneToOne with no inverse side, as the plugin ships it
  [PROFILE_UID]: {
    uid: PROFILE_UID,
    attributes: {
      user: relation(USER_UID, { relation: 'oneToOne' }),
      company: { type: 'string' },
    },
  },
  [REVIEW_UID]: {
    uid: REVIEW_UID,
    attributes: {
      author: relation(USER_UID),
      reviewers: relation(USER_UID, { relation: 'manyToMany' }),
      body: { type: 'text' },
    },
  },
  [FOLDER_UID]: {
    uid: FOLDER_UID,
    attributes: {
      name: { type: 'string' },
      notes: relation(NOTE_UID, { relation: 'oneToMany', mappedBy: 'folder' }),
    },
  },
};

const USER = {
  uid: USER_UID,
  id: 7,
  documentId: 'user-a',
  email: 'a@example.com',
  roles: [{ documentId: 'role-a', name: 'Authenticated', type: 'authenticated' }],
};

/** What core hands a condition: the row's params with the declared defaults filled in */
const contextOf = (
  uid: string,
  params: Record<string, unknown>,
  user: ConditionContext['user'] = USER
): ConditionContext => ({ user, uid, params, now: new Date('2026-10-29T00:00:00.000Z') });

const OWNED_BY_CALLER = { documentId: { $eq: '$user.documentId' } };

describe('the built-in conditions', () => {
  beforeEach(() => {
    // A plain object, like Strapi's registry: a key such as `constructor` finds an inherited value
    vi.stubGlobal('strapi', { contentType: (uid: string) => SCHEMAS[uid] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('are is-self then is-owner', () => {
    expect(BUILT_IN_CONDITIONS).toEqual([isSelf, isOwner]);
  });

  describe('relationsToUser', () => {
    it('lists the relations to the end user, of any kind, a oneToOne without inverse included', () => {
      expect(relationsToUser(NOTE_UID)).toEqual(['owner']);
      expect(relationsToUser(PROFILE_UID)).toEqual(['user']);
      expect(relationsToUser(REVIEW_UID)).toEqual(['author', 'reviewers']);
    });

    it('is empty for a type with no relation to the end user, or no type at all', () => {
      expect(relationsToUser(FOLDER_UID)).toEqual([]);
      expect(relationsToUser('api::nope.nope')).toEqual([]);
      expect(relationsToUser('constructor')).toEqual([]);
    });
  });

  describe('ownerField', () => {
    it('gives the explicit field, else the only user relation (a oneToOne without inverse included), else undefined', () => {
      expect(ownerField(PROFILE_UID, {})).toBe('user');
      expect(ownerField(NOTE_UID, { field: 'owner' })).toBe('owner');
      expect(ownerField(REVIEW_UID, { field: 'author' })).toBe('author');
      expect(ownerField(REVIEW_UID, { field: 'reviewers' })).toBe('reviewers');
      expect(ownerField(REVIEW_UID, {})).toBeUndefined();
      expect(ownerField(FOLDER_UID, {})).toBeUndefined();
    });

    it('takes a missing or null field as no field', () => {
      expect(ownerField(NOTE_UID, { field: null })).toBe('owner');
      expect(ownerField(NOTE_UID, undefined)).toBe('owner');
    });

    it('is undefined for an explicit field that is not a relation to the end user: it never falls back', () => {
      expect(ownerField(NOTE_UID, { field: 'folder' })).toBeUndefined();
      expect(ownerField(NOTE_UID, { field: 'title' })).toBeUndefined();
      expect(ownerField(NOTE_UID, { field: 'nope' })).toBeUndefined();
      expect(ownerField(NOTE_UID, { field: '' })).toBeUndefined();
      expect(ownerField(NOTE_UID, { field: 42 })).toBeUndefined();
      expect(ownerField(NOTE_UID, { field: '__proto__' })).toBeUndefined();
    });
  });

  describe('is-owner', () => {
    it('is declared as documented', () => {
      expect(isOwner).toMatchObject({
        name: 'plugin::end-users.is-owner',
        displayName: 'Is owner',
        params: {
          field: { type: 'attribute', relationTarget: USER_UID },
          setOnCreate: { type: 'boolean', default: true },
        },
        source: 'builtin',
      });
    });

    it('applies to the types with a relation to the end user only', () => {
      const subjects = isOwner.subjects as (uid: string) => boolean;

      expect(subjects(NOTE_UID)).toBe(true);
      expect(subjects(PROFILE_UID)).toBe(true);
      expect(subjects(REVIEW_UID)).toBe(true);
      expect(subjects(FOLDER_UID)).toBe(false);
    });

    it('is-owner gives the owner filter and stamps the owner', () => {
      const ctx = contextOf(NOTE_UID, { field: 'owner', setOnCreate: true });

      expect(isOwner.query(ctx)).toEqual({ owner: OWNED_BY_CALLER });
      expect(isOwner.stamp(ctx)).toEqual({ owner: { set: [{ documentId: 'user-a' }] } });
      expect(isOwner.lockedFields(ctx)).toEqual(['owner']);
    });

    it('finds the only user relation when the row names no field', () => {
      const ctx = contextOf(PROFILE_UID, { setOnCreate: true });

      expect(isOwner.query(ctx)).toEqual({ user: OWNED_BY_CALLER });
      expect(isOwner.stamp(ctx)).toEqual({ user: { set: [{ documentId: 'user-a' }] } });
      expect(isOwner.lockedFields(ctx)).toEqual(['user']);
    });

    it('stamps nothing with setOnCreate off, and still locks the owner', () => {
      const ctx = contextOf(NOTE_UID, { field: 'owner', setOnCreate: false });

      expect(isOwner.stamp(ctx)).toBeNull();
      expect(isOwner.lockedFields(ctx)).toEqual(['owner']);
    });

    it('is-owner fails closed with two user relations and no field', () => {
      const ctx = contextOf(REVIEW_UID, { setOnCreate: true });

      expect(isOwner.query(ctx)).toBe(false);
      expect(isOwner.stamp(ctx)).toBeNull();
      expect(isOwner.lockedFields(ctx)).toEqual([]);
    });

    it('fails closed for a field that is not a relation to the end user', () => {
      const ctx = contextOf(NOTE_UID, { field: 'folder', setOnCreate: true });

      expect(isOwner.query(ctx)).toBe(false);
      expect(isOwner.stamp(ctx)).toBeNull();
      expect(isOwner.lockedFields(ctx)).toEqual([]);
    });

    it('stamps nothing for Public, and does not throw', () => {
      const ctx = contextOf(NOTE_UID, { field: 'owner', setOnCreate: true }, null);

      expect(() => isOwner.stamp(ctx)).not.toThrow();
      expect(isOwner.stamp(ctx)).toBeNull();
    });

    it('leaves the documentId to the placeholder: the filter never carries the caller', () => {
      const ctx = contextOf(NOTE_UID, { field: 'owner', setOnCreate: true });

      expect(JSON.stringify(isOwner.query(ctx))).not.toContain('user-a');
    });
  });

  describe("through core's evaluateCondition and applyCondition", () => {
    // A row as it is stored: the field only, no setOnCreate, which core fills from the declared
    // default. `applyCondition` is what the checker and the engine's handler call.
    const STORED = { field: 'user' };
    const ctx = (user: ConditionContext['user']) => ({
      user,
      uid: PROFILE_UID,
      now: new Date('2026-10-29T00:00:00.000Z'),
    });

    it('fills setOnCreate for a stored is-owner row, and gives the owner filter, stamp and lock', () => {
      expect(evaluateCondition(isOwner, STORED, ctx(USER))).toEqual({
        user: { documentId: { $eq: 'user-a' } },
      });
      expect(applyCondition({ definition: isOwner, params: STORED }, ctx(USER))).toEqual({
        filter: { user: { documentId: { $eq: 'user-a' } } },
        stamp: { user: { set: [{ documentId: 'user-a' }] } },
        lockedFields: ['user'],
      });
    });

    it('is false for Public, whose stamp is never called', () => {
      expect(evaluateCondition(isOwner, STORED, ctx(null))).toBe(false);
      expect(applyCondition({ definition: isOwner, params: STORED }, ctx(null))).toBe(false);
    });
  });

  describe('is-self', () => {
    it('is the end user type matched on documentId', () => {
      expect(isSelf).toMatchObject({
        name: 'plugin::end-users.is-self',
        displayName: 'Is self',
        subjects: [USER_UID],
        query: { documentId: { $eq: '$user.documentId' } },
        source: 'builtin',
      });
    });

    it('is-self locks email and username: identity changes go through Better Auth', () => {
      // Called as core calls any condition's, with the context
      const { lockedFields } = isSelf as Modules.ContentAPI.ContentApiConditionDefinition;

      expect(lockedFields?.(contextOf(USER_UID, {}))).toEqual(['email', 'username']);
    });

    it('stamps nothing', () => {
      expect(isSelf).not.toHaveProperty('stamp');
    });
  });
});
