import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import type { ContentApiConditionDefinition } from '../conditions';

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';
const USER = 'plugin::end-users.user';

const mine: ContentApiConditionDefinition = {
  name: 'api::mine',
  displayName: 'Mine',
  query: { owner: { documentId: { $eq: '$user.documentId' } } },
};

const sampleUser = { uid: USER, id: 1, documentId: 'u1', roles: [] };

describe('Content API conditions: the utilities an editor calls', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;

  beforeEach(() => {
    global.strapi = {
      isLoaded: false,
      log: { debug: vi.fn(), error: vi.fn() },
      contentTypes: {},
      apis: {},
      plugins: {},
    } as unknown as Core.Strapi;

    p = instantiatePermissionsUtilities(global.strapi);
  });

  describe('validate', () => {
    it('validates without registering', () => {
      expect(p.conditions.validate(mine).name).toBe('api::mine');
      expect(p.providers.condition.has('api::mine')).toBe(false);
    });

    it('gives a frozen copy, so the caller keeps nothing that can change it', () => {
      const given = { ...mine, query: { owner: { documentId: { $eq: '$user.documentId' } } } };
      const validated = p.conditions.validate(given);

      expect(validated).not.toBe(given);
      expect(Object.isFrozen(validated)).toBe(true);
    });

    it('refuses a static empty query', () => {
      expect(() =>
        p.conditions.validate({ name: 'api::all', displayName: 'All', query: {} })
      ).toThrow(/query/);
    });

    it('throws an error that names the condition and the problem', () => {
      expect(() => p.conditions.validate({ name: 'api::nameless', query: { a: 1 } })).toThrow(
        /api::nameless.*displayName/
      );
      expect(() => p.conditions.validate('api::mine')).toThrow(/needs a name/);
    });
  });

  describe('evaluate', () => {
    it('evaluates for a sample user, and is false without one', () => {
      expect(p.conditions.evaluate(mine, undefined, { user: sampleUser, uid: NOTE })).toEqual({
        owner: { documentId: { $eq: 'u1' } },
      });
      expect(p.conditions.evaluate(mine, undefined, { user: null, uid: NOTE })).toBe(false);
    });

    it('binds the params it is given, and is false when a required one is missing', () => {
      const byState: ContentApiConditionDefinition = {
        name: 'api::by-state',
        displayName: 'By state',
        params: { state: { type: 'string', required: true } },
        query: { state: { $eq: '$params.state' } },
      };

      expect(
        p.conditions.evaluate(byState, { state: 'open' }, { user: sampleUser, uid: NOTE })
      ).toEqual({ state: { $eq: 'open' } });
      expect(p.conditions.evaluate(byState, undefined, { user: sampleUser, uid: NOTE })).toBe(
        false
      );
    });

    it('is false for a type outside the condition subjects', () => {
      const noteOnly = { ...mine, subjects: [NOTE] };

      expect(p.conditions.evaluate(noteOnly, undefined, { user: sampleUser, uid: ARTICLE })).toBe(
        false
      );
    });

    describe('$now', () => {
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('is the moment of the call', () => {
        const live: ContentApiConditionDefinition = {
          name: 'api::live',
          displayName: 'Live',
          query: { publishAt: { $lte: '$now' } },
        };

        expect(p.conditions.evaluate(live, undefined, { user: null, uid: NOTE })).toEqual({
          publishAt: { $lte: '2026-11-03T10:00:00.000Z' },
        });
      });
    });
  });

  describe('appliesTo', () => {
    it('tells whether a condition applies to a type', () => {
      const noteOnly = { ...mine, subjects: [NOTE] };

      expect(p.conditions.appliesTo(noteOnly, NOTE)).toBe(true);
      expect(p.conditions.appliesTo(noteOnly, ARTICLE)).toBe(false);
    });

    it('applies to every type when the condition names no subjects', () => {
      expect(p.conditions.appliesTo(mine, NOTE)).toBe(true);
      expect(p.conditions.appliesTo(mine, ARTICLE)).toBe(true);
    });

    it('calls a subjects function with the uid', () => {
      const subjects = vi.fn((uid: string) => uid === ARTICLE);
      const byFunction = { ...mine, subjects };

      expect(p.conditions.appliesTo(byFunction, ARTICLE)).toBe(true);
      expect(p.conditions.appliesTo(byFunction, NOTE)).toBe(false);
      expect(subjects).toHaveBeenNthCalledWith(1, ARTICLE);
      expect(subjects).toHaveBeenNthCalledWith(2, NOTE);
    });
  });

  it('registers nothing and works once Strapi has loaded', () => {
    global.strapi.isLoaded = true;

    expect(p.conditions.validate(mine).name).toBe('api::mine');
    expect(p.conditions.evaluate(mine, undefined, { user: sampleUser, uid: NOTE })).toEqual({
      owner: { documentId: { $eq: 'u1' } },
    });
    expect(p.conditions.appliesTo(mine, NOTE)).toBe(true);
    expect(p.providers.condition.values()).toEqual([]);
  });
});
