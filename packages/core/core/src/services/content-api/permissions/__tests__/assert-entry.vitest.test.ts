import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isEqual } from 'lodash';
import { DENY_ALL_FILTER, errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import type { ConditionUser, ContentApiPermission } from '../types';

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';
const POST = 'api::post.post';
const PAGE = 'api::page.page';
const USER_UID = 'plugin::end-users.user';

/** How the Document Service treats each type: with draft & publish, localized, or neither */
const TYPES: Record<string, { draftAndPublish: boolean; localized: boolean }> = {
  [NOTE]: { draftAndPublish: false, localized: false },
  [ARTICLE]: { draftAndPublish: true, localized: false },
  [POST]: { draftAndPublish: false, localized: true },
  [PAGE]: { draftAndPublish: true, localized: true },
};

const DEFAULT_LOCALE = 'en';

const user: ConditionUser = {
  uid: USER_UID,
  id: 7,
  documentId: 'u1',
  roles: [{ documentId: 'r1' }],
};

/** What `filtersFor` gives for one row conditioned by test.mine, for user u1 */
const MINE = { $or: [{ $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }] }] }] };
const mine = [{ name: 'test.mine' }];

/** One stored entry. `status` is only set on a draft & publish type, `locale` on a localized one. */
interface Version {
  documentId: string;
  owner: 'u1' | 'u2';
  status?: 'draft' | 'published';
  locale?: string;
}

const contentApi = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => [
      name,
      Object.assign(() => {}, { [Symbol.for('__type__')]: ['content-api'] }),
    ])
  );

describe('Content API permissions: entryMatches and assertEntry', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;
  let documents: ReturnType<typeof vi.fn>;
  let store: Version[];
  let counts: Array<Record<string, unknown>>;

  /**
   * `count` as the Document Service answers it over `store`, which is what scopes the lookups the
   * way the writes are scoped: the default locale when none is given (`defaultLocale`), `'*'` for
   * all of them and a list for those (`multiLocaleToLookup`), the draft unless told otherwise on a
   * draft & publish type (`defaultStatus`). A type that isn't localized, or has no draft &
   * publish, ignores the locale or the status. The filters are what the check builds: `documentId`
   * alone, or ANDed with the caller's.
   */
  const countIn = (uid: string, params: Record<string, any>) => {
    const { draftAndPublish, localized } = TYPES[uid];
    const { filters, status, locale } = params;

    const documentId = filters.$and ? filters.$and[0].documentId : filters.documentId;
    const extra = filters.$and?.[1];

    const holds = (version: Version) => {
      if (extra === undefined || isEqual(extra, {})) {
        return true;
      }

      if (isEqual(extra, DENY_ALL_FILTER)) {
        return false;
      }

      if (isEqual(extra, MINE)) {
        return version.owner === 'u1';
      }

      throw new Error(`unexpected filter ${JSON.stringify(extra)}`);
    };

    const scope: string = locale || DEFAULT_LOCALE;
    const wantedStatus = status === 'published' ? 'published' : 'draft';

    return store.filter(
      (version) =>
        version.documentId === documentId &&
        (!draftAndPublish || version.status === wantedStatus) &&
        (!localized || scope === '*' || [scope].flat().includes(version.locale as string)) &&
        holds(version)
    ).length;
  };

  beforeEach(async () => {
    store = [];
    counts = [];
    documents = vi.fn((uid: string) => ({
      count: vi.fn(async (params: Record<string, unknown>) => {
        counts.push(params);

        return countIn(uid, params as Record<string, any>);
      }),
    }));

    const contentTypes = Object.fromEntries(
      Object.entries(TYPES).map(([uid, { draftAndPublish }]) => [
        uid,
        { uid, options: { draftAndPublish } },
      ])
    );

    global.strapi = {
      isLoaded: false,
      log: { debug: vi.fn() },
      contentTypes,
      contentType: (uid: string) => contentTypes[uid],
      documents,
      apis: Object.fromEntries(
        Object.keys(TYPES).map((uid) => {
          const name = uid.split('.')[1];

          return [
            name,
            {
              controllers: {
                [name]: contentApi('find', 'findOne', 'create', 'update', 'delete'),
              },
            },
          ];
        })
      ),
      plugins: {},
    } as unknown as Core.Strapi;

    p = instantiatePermissionsUtilities(global.strapi);
    await p.registerActions();
    await p.providers.condition.register({
      name: 'test.mine',
      displayName: 'Mine',
      query: { owner: { documentId: { $eq: '$user.documentId' } } },
    });
  });

  const authOf = async (rows: ContentApiPermission[], caller: ConditionUser | null = user) => ({
    strategy: { name: 'end-users' },
    credentials: caller,
    ability: await p.generateAbility(rows, { user: caller }),
  });

  /** A caller who may update, delete (and publish, on draft & publish) the type's entries that are theirs */
  const ownerOf = (uid: string) =>
    authOf(
      (TYPES[uid].draftAndPublish ? ['update', 'delete', 'publish'] : ['update', 'delete']).map(
        (verb) => ({ action: `${uid}.${verb}`, conditions: mine })
      )
    );

  /** What the Document Service has stored: one entry per version, in the shape of the type */
  const stored = (versions: Version[]) => {
    store = versions;
  };

  it('does not query when the ability is not subject-aware', async () => {
    const routeAbility = await p.engine.generateAbility([{ action: `${NOTE}.update` }]);
    const token = { strategy: { name: 'api-token' }, credentials: {}, ability: routeAbility };
    const usersPermissions = {
      strategy: { name: 'users-permissions' },
      credentials: { id: 1 },
      ability: routeAbility,
    };

    for (const auth of [token, usersPermissions, null, undefined, {}, { ability: null }]) {
      for (const action of ['update', 'delete', 'publish'] as const) {
        expect(await p.entryMatches(auth, action, NOTE, 'n1')).toBe(true);
        await expect(p.assertEntry(auth, action, ARTICLE, 'a1')).resolves.toBeUndefined();
        // Whatever the locale: no query, so no scope to get wrong
        expect(await p.entryMatches(auth, action, PAGE, 'p1', { locale: '*' })).toBe(true);
      }
    }

    expect(documents).not.toHaveBeenCalled();
  });

  describe('the lookups', () => {
    it('counts the versions with documentId ANDed with the filters, then all of them, with no status off draft & publish', async () => {
      const auth = await authOf([{ action: `${NOTE}.update`, conditions: mine }]);

      stored([{ documentId: 'n1', owner: 'u1' }]);

      expect(await p.entryMatches(auth, 'update', NOTE, 'n1')).toBe(true);

      expect(documents).toHaveBeenCalledWith(NOTE);
      expect(counts).toStrictEqual([
        { filters: { $and: [{ documentId: 'n1' }, MINE] } },
        { filters: { documentId: 'n1' } },
      ]);
    });

    it('counts the drafts of a draft & publish type, in the locale given', async () => {
      const auth = await authOf([{ action: `${ARTICLE}.update`, conditions: mine }]);

      stored([{ documentId: 'a1', owner: 'u1', status: 'draft' }]);

      expect(await p.entryMatches(auth, 'update', ARTICLE, 'a1', { locale: 'fr' })).toBe(true);

      expect(documents).toHaveBeenCalledWith(ARTICLE);
      expect(counts).toStrictEqual([
        { filters: { $and: [{ documentId: 'a1' }, MINE] }, status: 'draft', locale: 'fr' },
        { filters: { documentId: 'a1' }, status: 'draft', locale: 'fr' },
      ]);
    });

    it('ANDs the deny filter for null filters, and stops at the first counts: publish without a row never matches', async () => {
      const auth = await authOf([{ action: `${ARTICLE}.update` }]);

      stored([{ documentId: 'a1', owner: 'u1', status: 'draft' }]);

      expect(p.checker.filtersFor(auth, 'publish', ARTICLE)).toBeNull();
      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(false);

      // The draft and the published version, once each: nothing matches, so nothing else is asked
      expect(counts).toHaveLength(2);
      expect(counts.map(({ status }) => status)).toStrictEqual(['draft', 'published']);

      for (const { filters } of counts as Array<{ filters: { $and: unknown[] } }>) {
        expect(filters).toEqual({ $and: [{ documentId: 'a1' }, DENY_ALL_FILTER] });
        // A copy: nothing downstream can write into the shared constant
        expect(filters.$and[1]).not.toBe(DENY_ALL_FILTER);
      }
    });

    it('ANDs the deny filter when every condition of a held row fails (Public)', async () => {
      const auth = await authOf([{ action: `${NOTE}.delete`, conditions: mine }], null);

      stored([{ documentId: 'n1', owner: 'u1' }]);

      expect(await p.entryMatches(auth, 'delete', NOTE, 'n1')).toBe(false);
      expect(counts[0]).toEqual({
        filters: { $and: [{ documentId: 'n1' }, DENY_ALL_FILTER] },
      });
    });

    it('ANDs {} for an unconditioned row, and for a pair the caller holds no row for', async () => {
      const auth = await authOf([{ action: `${NOTE}.update` }]);

      stored([
        { documentId: 'n1', owner: 'u2' },
        { documentId: 'n2', owner: 'u2' },
      ]);

      expect(await p.entryMatches(auth, 'update', NOTE, 'n1')).toBe(true);
      // No delete row: route-level only
      expect(await p.entryMatches(auth, 'delete', NOTE, 'n2')).toBe(true);

      expect(counts.map(({ filters }) => filters)).toStrictEqual([
        { $and: [{ documentId: 'n1' }, {}] },
        { documentId: 'n1' },
        { $and: [{ documentId: 'n2' }, {}] },
        { documentId: 'n2' },
      ]);
    });

    it('answers false with no lookup for a documentId that is not a string, or a type not registered', async () => {
      const auth = await ownerOf(NOTE);

      for (const documentId of ['', undefined, null, 1, { $ne: null }, ['n1']]) {
        expect(await p.entryMatches(auth, 'update', NOTE, documentId as string)).toBe(false);
      }

      expect(await p.entryMatches(auth, 'update', 'api::nope.nope', 'n1')).toBe(false);
      expect(await p.entryMatches(auth, 'update', 'constructor' as 'api::nope.nope', 'n1')).toBe(
        false
      );

      expect(documents).not.toHaveBeenCalled();
    });

    it('answers false with no lookup for an action that is not update, delete or publish', async () => {
      const auth = await ownerOf(NOTE);
      const routeAbility = await p.engine.generateAbility([{ action: `${NOTE}.update` }]);
      const token = { strategy: { name: 'api-token' }, credentials: {}, ability: routeAbility };

      // Anything but delete or publish would be read as an update, so a typo or a custom action
      // would check the drafts and pass: types are erased at runtime
      for (const action of [
        'find',
        'create',
        'read-drafts',
        'Update',
        'constructor',
        '',
        undefined,
        null,
        1,
        ['update'],
      ]) {
        for (const caller of [auth, token]) {
          const asAction = action as unknown as 'update';

          expect(await p.entryMatches(caller, asAction, NOTE, 'n1'), String(action)).toBe(false);
          await expect(p.assertEntry(caller, asAction, NOTE, 'n1')).rejects.toThrow('Not Found');
        }
      }

      expect(documents).not.toHaveBeenCalled();
    });

    it('answers false with no lookup for a locale that is not a string, "*" or a list of strings', async () => {
      const auth = await ownerOf(POST);

      stored([{ documentId: 'p1', owner: 'u1', locale: 'en' }]);

      for (const locale of [null, 1, true, {}, { $ne: 'en' }, ['en', 1], [['en']], [null]]) {
        for (const action of ['update', 'delete', 'publish'] as const) {
          expect(
            await p.entryMatches(auth, action, POST, 'p1', { locale: locale as unknown as string })
          ).toBe(false);
        }
      }

      expect(documents).not.toHaveBeenCalled();
    });
  });

  /** An article's draft, then its published version, owned by the users given in that order */
  const drafts = (...owners: Array<'u1' | 'u2'>): Version[] =>
    owners.map((owner, index) => ({
      documentId: 'a1',
      owner,
      status: index === 0 ? 'draft' : 'published',
    }));

  describe('a delete: every version it removes', () => {
    it('counts the draft and the published version of a draft & publish type', async () => {
      const auth = await ownerOf(ARTICLE);

      stored(drafts('u1', 'u1'));

      expect(await p.entryMatches(auth, 'delete', ARTICLE, 'a1')).toBe(true);

      expect(counts).toStrictEqual([
        { filters: { $and: [{ documentId: 'a1' }, MINE] }, status: 'draft' },
        { filters: { $and: [{ documentId: 'a1' }, MINE] }, status: 'published' },
        { filters: { documentId: 'a1' }, status: 'draft' },
        { filters: { documentId: 'a1' }, status: 'published' },
      ]);
    });

    it('refuses it when the published version does not match, although the draft does', async () => {
      const auth = await ownerOf(ARTICLE);

      stored(drafts('u1', 'u2'));

      expect(await p.entryMatches(auth, 'delete', ARTICLE, 'a1')).toBe(false);
      await expect(p.assertEntry(auth, 'delete', ARTICLE, 'a1')).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
    });

    it('refuses it when the draft does not match, although the published version does', async () => {
      const auth = await ownerOf(ARTICLE);

      stored(drafts('u2', 'u1'));

      expect(await p.entryMatches(auth, 'delete', ARTICLE, 'a1')).toBe(false);
    });

    it('allows it for a document with a draft only, or a published version only, that matches', async () => {
      const auth = await ownerOf(ARTICLE);

      stored([{ documentId: 'a1', owner: 'u1', status: 'draft' }]);
      expect(await p.entryMatches(auth, 'delete', ARTICLE, 'a1')).toBe(true);

      stored([{ documentId: 'a1', owner: 'u1', status: 'published' }]);
      expect(await p.entryMatches(auth, 'delete', ARTICLE, 'a1')).toBe(true);
    });

    it('refuses a document that does not exist, as it refuses one that is not the caller’s', async () => {
      const auth = await ownerOf(ARTICLE);

      stored([{ documentId: 'other', owner: 'u1', status: 'draft' }]);

      expect(await p.entryMatches(auth, 'delete', ARTICLE, 'a1')).toBe(false);
      // Nothing matched, so the unfiltered counts are not asked for
      expect(counts).toHaveLength(2);
    });

    it('checks the one version of a type without draft & publish', async () => {
      const auth = await ownerOf(NOTE);

      stored([{ documentId: 'n1', owner: 'u2' }]);

      expect(await p.entryMatches(auth, 'delete', NOTE, 'n1')).toBe(false);

      stored([{ documentId: 'n1', owner: 'u1' }]);

      expect(await p.entryMatches(auth, 'delete', NOTE, 'n1')).toBe(true);
    });

    it('leaves an update to the draft, which is what it writes: a published snapshot of someone else does not refuse it', async () => {
      const auth = await ownerOf(ARTICLE);

      // The draft is the caller's, the published snapshot still names the previous owner: this is how
      // an owner is changed, so checking the snapshot would 404 the new owner
      stored(drafts('u1', 'u2'));

      expect(await p.entryMatches(auth, 'update', ARTICLE, 'a1')).toBe(true);
      expect(await p.entryMatches(auth, 'delete', ARTICLE, 'a1')).toBe(false);

      // The draft is someone else's, whatever the published version says
      stored(drafts('u2', 'u1'));

      expect(await p.entryMatches(auth, 'update', ARTICLE, 'a1')).toBe(false);
    });
  });

  describe('a publish: every stored version, because it replaces the published one', () => {
    it('counts the draft and the published version of a draft & publish type', async () => {
      const auth = await ownerOf(ARTICLE);

      stored(drafts('u1', 'u1'));

      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(true);

      expect(counts).toStrictEqual([
        { filters: { $and: [{ documentId: 'a1' }, MINE] }, status: 'draft' },
        { filters: { $and: [{ documentId: 'a1' }, MINE] }, status: 'published' },
        { filters: { documentId: 'a1' }, status: 'draft' },
        { filters: { documentId: 'a1' }, status: 'published' },
      ]);
    });

    it('refuses it when the published version is not the caller’s, although the draft is: publishing would take it over', async () => {
      const auth = await ownerOf(ARTICLE);

      stored(drafts('u1', 'u2'));

      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(false);
      await expect(p.assertEntry(auth, 'publish', ARTICLE, 'a1')).rejects.toBeInstanceOf(
        errors.NotFoundError
      );
    });

    it('refuses it when the draft is not the caller’s, whatever the published version says', async () => {
      const auth = await ownerOf(ARTICLE);

      stored(drafts('u2', 'u1'));

      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(false);
    });

    it('allows it for a document with a draft only, or a published version only, that matches', async () => {
      const auth = await ownerOf(ARTICLE);

      stored([{ documentId: 'a1', owner: 'u1', status: 'draft' }]);
      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(true);

      stored([{ documentId: 'a1', owner: 'u1', status: 'published' }]);
      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(true);

      stored([{ documentId: 'a1', owner: 'u2', status: 'published' }]);
      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(false);
    });

    it('refuses a document that does not exist, and stops at the first counts', async () => {
      const auth = await ownerOf(ARTICLE);

      stored([{ documentId: 'other', owner: 'u1', status: 'draft' }]);

      expect(await p.entryMatches(auth, 'publish', ARTICLE, 'a1')).toBe(false);
      expect(counts).toHaveLength(2);
    });
  });

  describe('the locales in scope', () => {
    const en = (owner: 'u1' | 'u2' = 'u1'): Version => ({
      documentId: 'p1',
      owner,
      locale: 'en',
    });
    const fr = (owner: 'u1' | 'u2'): Version => ({ documentId: 'p1', owner, locale: 'fr' });
    const de = (owner: 'u1' | 'u2'): Version => ({ documentId: 'p1', owner, locale: 'de' });

    it('checks the default locale when none is given, as the write does, and no other', async () => {
      const auth = await ownerOf(POST);

      stored([en('u1'), fr('u2')]);

      expect(await p.entryMatches(auth, 'delete', POST, 'p1')).toBe(true);
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: 'en' })).toBe(true);
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: 'fr' })).toBe(false);
      // An empty locale is what the service takes for none
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: '' })).toBe(true);
    });

    it('checks every locale for "*": a delete removes them all, so one that does not match refuses it', async () => {
      const auth = await ownerOf(POST);

      stored([en('u1'), fr('u1'), de('u1')]);
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: '*' })).toBe(true);

      stored([en('u1'), fr('u2'), de('u1')]);
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: '*' })).toBe(false);
      await expect(
        p.assertEntry(auth, 'delete', POST, 'p1', { locale: '*' })
      ).rejects.toBeInstanceOf(errors.NotFoundError);

      // The locale reaches the Document Service as given: it is its scoping that applies
      expect(counts.at(-1)).toMatchObject({ locale: '*' });
    });

    it('checks the locales of a list, and only those', async () => {
      const auth = await ownerOf(POST);

      stored([en('u1'), fr('u2'), de('u1')]);

      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: ['en', 'de'] })).toBe(true);
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: ['en', 'fr'] })).toBe(
        false
      );
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: ['fr'] })).toBe(false);
      // A locale the document has no entry in adds nothing to check
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: ['en', 'es'] })).toBe(true);
      // An empty list names no entry: nothing to delete
      expect(await p.entryMatches(auth, 'delete', POST, 'p1', { locale: [] })).toBe(false);
    });

    it('checks the draft and the published version of every locale on draft & publish', async () => {
      const auth = await ownerOf(PAGE);
      const version = (
        locale: string,
        status: 'draft' | 'published',
        owner: 'u1' | 'u2'
      ): Version => ({ documentId: 'p1', owner, locale, status });

      stored([
        version('en', 'draft', 'u1'),
        version('en', 'published', 'u1'),
        version('fr', 'draft', 'u1'),
        version('fr', 'published', 'u1'),
      ]);
      expect(await p.entryMatches(auth, 'delete', PAGE, 'p1', { locale: '*' })).toBe(true);

      stored([
        version('en', 'draft', 'u1'),
        version('en', 'published', 'u1'),
        version('fr', 'draft', 'u1'),
        version('fr', 'published', 'u2'),
      ]);
      expect(await p.entryMatches(auth, 'delete', PAGE, 'p1', { locale: '*' })).toBe(false);
      expect(await p.entryMatches(auth, 'delete', PAGE, 'p1', { locale: ['en', 'fr'] })).toBe(
        false
      );
      expect(await p.entryMatches(auth, 'delete', PAGE, 'p1', { locale: 'en' })).toBe(true);
    });

    it('checks every locale in scope for an update or a publish of "*" or a list, when a document has drafts only', async () => {
      const auth = await ownerOf(PAGE);
      const draft = (locale: string, owner: 'u1' | 'u2'): Version => ({
        documentId: 'p1',
        owner,
        locale,
        status: 'draft',
      });

      stored([draft('en', 'u1'), draft('fr', 'u1')]);

      for (const action of ['update', 'publish'] as const) {
        expect(await p.entryMatches(auth, action, PAGE, 'p1', { locale: '*' })).toBe(true);
        expect(await p.entryMatches(auth, action, PAGE, 'p1', { locale: ['en', 'fr'] })).toBe(true);
      }

      stored([draft('en', 'u1'), draft('fr', 'u2')]);

      for (const action of ['update', 'publish'] as const) {
        expect(await p.entryMatches(auth, action, PAGE, 'p1', { locale: '*' })).toBe(false);
        expect(await p.entryMatches(auth, action, PAGE, 'p1', { locale: ['en', 'fr'] })).toBe(
          false
        );
        expect(await p.entryMatches(auth, action, PAGE, 'p1', { locale: ['en'] })).toBe(true);
      }
    });

    it('checks the published version of every locale for a publish of "*" or a list, and not for an update', async () => {
      const auth = await ownerOf(PAGE);
      const version = (
        locale: string,
        status: 'draft' | 'published',
        owner: 'u1' | 'u2'
      ): Version => ({ documentId: 'p1', owner, locale, status });

      // Every draft is the caller's; the French published version is someone else's, and publishing
      // the French draft replaces it
      stored([
        version('en', 'draft', 'u1'),
        version('en', 'published', 'u1'),
        version('fr', 'draft', 'u1'),
        version('fr', 'published', 'u2'),
      ]);

      expect(await p.entryMatches(auth, 'publish', PAGE, 'p1', { locale: '*' })).toBe(false);
      expect(await p.entryMatches(auth, 'publish', PAGE, 'p1', { locale: ['en', 'fr'] })).toBe(
        false
      );
      expect(await p.entryMatches(auth, 'publish', PAGE, 'p1', { locale: 'fr' })).toBe(false);
      expect(await p.entryMatches(auth, 'publish', PAGE, 'p1', { locale: ['fr'] })).toBe(false);
      // The locales whose versions are all the caller's
      expect(await p.entryMatches(auth, 'publish', PAGE, 'p1', { locale: 'en' })).toBe(true);
      expect(await p.entryMatches(auth, 'publish', PAGE, 'p1', { locale: ['en'] })).toBe(true);

      // An update writes the drafts, and they are all the caller's
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: '*' })).toBe(true);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: ['en', 'fr'] })).toBe(true);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(true);
    });

    it('lets a type that is not localized ignore the locale, as the service does', async () => {
      const auth = await ownerOf(NOTE);

      stored([{ documentId: 'n1', owner: 'u1' }]);

      for (const locale of ['*', 'fr', ['en', 'fr']]) {
        expect(await p.entryMatches(auth, 'delete', NOTE, 'n1', { locale })).toBe(true);
        expect(await p.entryMatches(auth, 'update', NOTE, 'n1', { locale })).toBe(true);
      }

      stored([{ documentId: 'n1', owner: 'u2' }]);

      for (const locale of ['*', 'fr', ['en', 'fr']]) {
        expect(await p.entryMatches(auth, 'delete', NOTE, 'n1', { locale })).toBe(false);
      }
    });
  });

  describe('an update into a locale the document has no entry in', () => {
    const post = (locale: string, owner: 'u1' | 'u2'): Version => ({
      documentId: 'p1',
      owner,
      locale,
    });

    it('allows it when every existing entry of the document matches', async () => {
      const auth = await ownerOf(POST);

      stored([post('en', 'u1')]);
      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: 'fr' })).toBe(true);

      // The other locales, all of them, are what is asked: the matching entries, then every entry
      expect(counts.slice(-2)).toStrictEqual([
        { filters: { $and: [{ documentId: 'p1' }, MINE] }, locale: '*' },
        { filters: { documentId: 'p1' }, locale: '*' },
      ]);

      stored([post('en', 'u1'), post('de', 'u1')]);
      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: 'fr' })).toBe(true);
    });

    it('refuses it when one existing entry matches and another locale’s does not', async () => {
      const auth = await ownerOf(POST);

      stored([post('en', 'u1'), post('de', 'u2')]);
      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: 'fr' })).toBe(false);

      stored([post('en', 'u2'), post('de', 'u1')]);
      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: 'fr' })).toBe(false);
      await expect(
        p.assertEntry(auth, 'update', POST, 'p1', { locale: 'fr' })
      ).rejects.toBeInstanceOf(errors.NotFoundError);
    });

    it('refuses it when none of the document’s entries matches', async () => {
      const auth = await ownerOf(POST);

      stored([post('en', 'u2'), post('de', 'u2')]);

      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: 'fr' })).toBe(false);
      await expect(
        p.assertEntry(auth, 'update', POST, 'p1', { locale: 'fr' })
      ).rejects.toBeInstanceOf(errors.NotFoundError);
    });

    it('stays a create path, which this check does not allow, for a document with no entry at all', async () => {
      const auth = await ownerOf(POST);

      stored([{ documentId: 'other', owner: 'u1', locale: 'en' }]);

      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: 'fr' })).toBe(false);
      expect(await p.entryMatches(auth, 'update', POST, 'p1')).toBe(false);
    });

    it('does not apply when the locale has an entry the caller may not write', async () => {
      const auth = await ownerOf(POST);

      // The caller's own English entry does not make the French one theirs
      stored([post('en', 'u1'), post('fr', 'u2')]);

      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: 'fr' })).toBe(false);
    });

    it('does not apply to a publish, which publishes the drafts that are there', async () => {
      const auth = await ownerOf(PAGE);

      stored([{ documentId: 'p1', owner: 'u1', locale: 'en', status: 'draft' }]);

      expect(await p.entryMatches(auth, 'publish', PAGE, 'p1', { locale: 'fr' })).toBe(false);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(true);
    });

    it('does not apply to "*" or a list, which name no one locale to add', async () => {
      const auth = await ownerOf(POST);

      stored([]);
      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: '*' })).toBe(false);
      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: ['fr', 'de'] })).toBe(
        false
      );

      stored([post('en', 'u1')]);
      expect(await p.entryMatches(auth, 'update', POST, 'p1', { locale: ['fr', 'de'] })).toBe(
        false
      );
    });

    it('counts the drafts of every locale on draft & publish: every draft must match', async () => {
      const auth = await ownerOf(PAGE);
      const draft = (locale: string, owner: 'u1' | 'u2'): Version => ({
        documentId: 'p1',
        owner,
        locale,
        status: 'draft',
      });

      stored([draft('en', 'u1'), draft('de', 'u1')]);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(true);

      // The drafts of the other locales, all of them, matching and then every one: no published
      expect(counts.slice(-2)).toStrictEqual([
        { filters: { $and: [{ documentId: 'p1' }, MINE] }, status: 'draft', locale: '*' },
        { filters: { documentId: 'p1' }, status: 'draft', locale: '*' },
      ]);
      expect(counts.some(({ status }) => status === 'published')).toBe(false);
    });

    it('refuses it when one locale’s draft matches and another locale’s does not', async () => {
      const auth = await ownerOf(PAGE);
      const draft = (locale: string, owner: 'u1' | 'u2'): Version => ({
        documentId: 'p1',
        owner,
        locale,
        status: 'draft',
      });

      stored([draft('en', 'u1'), draft('de', 'u2')]);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(false);

      stored([draft('en', 'u2'), draft('de', 'u1')]);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(false);
    });

    it('does not count a published version: a match there alone is refused', async () => {
      const auth = await ownerOf(PAGE);
      const version = (
        locale: string,
        status: 'draft' | 'published',
        owner: 'u1' | 'u2'
      ): Version => ({ documentId: 'p1', owner, locale, status });

      // Only a published version, and it is the caller's: there is no draft to be theirs
      stored([version('en', 'published', 'u1')]);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(false);

      // A draft that is someone else's, beside a published version that is the caller's
      stored([version('en', 'draft', 'u2'), version('en', 'published', 'u1')]);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(false);

      // The drafts all match: a published version of another owner does not refuse it. What a
      // publish would replace is checked by the publish that follows an update, not here
      stored([
        version('en', 'draft', 'u1'),
        version('en', 'published', 'u2'),
        version('de', 'draft', 'u1'),
      ]);
      expect(await p.entryMatches(auth, 'update', PAGE, 'p1', { locale: 'fr' })).toBe(true);
    });

    it('adds the default locale when none is given and the document has no entry in it', async () => {
      const auth = await ownerOf(PAGE);

      stored([{ documentId: 'p1', owner: 'u1', locale: 'fr', status: 'draft' }]);

      expect(await p.entryMatches(auth, 'update', PAGE, 'p1')).toBe(true);

      stored([{ documentId: 'p1', owner: 'u2', locale: 'fr', status: 'draft' }]);

      expect(await p.entryMatches(auth, 'update', PAGE, 'p1')).toBe(false);
    });

    it('is the check of the document for a type that is not localized: a draft missing is a missing document', async () => {
      const auth = await ownerOf(NOTE);

      stored([]);

      expect(await p.entryMatches(auth, 'update', NOTE, 'n1')).toBe(false);
    });
  });

  describe('the answer', () => {
    it('throws NotFoundError when no stored entry matches', async () => {
      const auth = await authOf([{ action: `${NOTE}.update`, conditions: mine }]);

      stored([{ documentId: 'n1', owner: 'u2' }]);

      expect(await p.entryMatches(auth, 'update', NOTE, 'n1')).toBe(false);

      const error = await p.assertEntry(auth, 'update', NOTE, 'n1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(errors.NotFoundError);
      expect(error).not.toBeInstanceOf(errors.ForbiddenError);
      // The body Strapi sends for a document that doesn't exist, so the two can't be told apart
      expect(error).toMatchObject({ name: 'NotFoundError', message: 'Not Found', details: {} });
    });

    it('passes when the stored entry matches', async () => {
      const auth = await authOf([{ action: `${NOTE}.delete`, conditions: mine }]);

      stored([{ documentId: 'n1', owner: 'u1' }]);

      expect(await p.entryMatches(auth, 'delete', NOTE, 'n1')).toBe(true);
      await expect(p.assertEntry(auth, 'delete', NOTE, 'n1')).resolves.toBeUndefined();
    });
  });
});
