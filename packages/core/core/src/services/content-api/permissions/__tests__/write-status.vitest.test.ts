import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isEqual } from 'lodash';
import { DENY_ALL_FILTER } from '@strapi/utils';
import type { Core } from '@strapi/types';

import instantiatePermissionsUtilities from '..';
import type { ConditionUser, ContentApiPermission } from '../types';

const NOTE = 'api::note.note';
const ARTICLE = 'api::article.article';
const USER_UID = 'plugin::end-users.user';

/** Which types have draft & publish */
const TYPES: Record<string, boolean> = { [NOTE]: false, [ARTICLE]: true };

const user: ConditionUser = {
  uid: USER_UID,
  id: 7,
  documentId: 'u1',
  roles: [{ documentId: 'r1' }],
};

/** What `filtersFor` gives for one row conditioned by test.mine, for user u1 */
const MINE = { $or: [{ $and: [{ $or: [{ owner: { documentId: { $eq: 'u1' } } }] }] }] };
const mine = [{ name: 'test.mine' }];

/** One stored version of an article */
interface Version {
  documentId: string;
  owner: 'u1' | 'u2';
  status: 'draft' | 'published';
}

const contentApi = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => [
      name,
      Object.assign(() => {}, { [Symbol.for('__type__')]: ['content-api'] }),
    ])
  );

describe('Content API permissions: resolveWriteStatus and publishIfAllowed', () => {
  let p: ReturnType<typeof instantiatePermissionsUtilities>;
  let store: Version[];
  let counts: Array<Record<string, unknown>>;
  let publish: ReturnType<typeof vi.fn>;
  let documents: ReturnType<typeof vi.fn>;
  let record: ReturnType<typeof vi.spyOn>;

  /** `count` over `store`: the versions of the status, with documentId ANDed to the caller's filters */
  const countIn = (params: Record<string, any>) => {
    const { filters, status } = params;
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

    return store.filter(
      (version) =>
        version.documentId === documentId &&
        (status === undefined || version.status === status) &&
        holds(version)
    ).length;
  };

  beforeEach(async () => {
    store = [];
    counts = [];
    publish = vi.fn(async () => ({ entries: [] }));
    documents = vi.fn(() => ({
      count: vi.fn(async (params: Record<string, unknown>) => {
        counts.push(params);

        return countIn(params as Record<string, any>);
      }),
      publish,
    }));

    const contentTypes = Object.fromEntries(
      Object.entries(TYPES).map(([uid, draftAndPublish]) => [
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
    await p.providers.condition.register({
      name: 'test.never',
      displayName: 'Never',
      query: () => false,
    });

    record = vi.spyOn(p.checker, 'record');
  });

  const authOf = async (rows: ContentApiPermission[]) => ({
    strategy: { name: 'end-users' },
    credentials: user,
    ability: await p.generateAbility(rows, { user }),
  });

  const publishRow = (conditions?: Array<{ name: string }>): ContentApiPermission => ({
    action: `${ARTICLE}.publish`,
    ...(conditions ? { conditions } : {}),
  });

  it("keeps today's status for abilities that are not subject-aware", async () => {
    const routeAbility = await p.engine.generateAbility([{ action: `${ARTICLE}.update` }]);
    const token = { strategy: { name: 'api-token' }, credentials: {}, ability: routeAbility };

    for (const auth of [token, null, undefined, {}, { ability: null }]) {
      for (const requested of [undefined, 'draft', 'published'] as const) {
        // eslint-disable-next-line no-await-in-loop
        expect(await p.resolveWriteStatus(auth, ARTICLE, { requested })).toEqual({
          status: requested,
          publishAfterCreate: false,
        });
        // eslint-disable-next-line no-await-in-loop
        expect(
          await p.resolveWriteStatus(auth, ARTICLE, { requested, documentId: 'a1', locale: 'fr' })
        ).toEqual({ status: requested, publishAfterCreate: false });
      }

      // eslint-disable-next-line no-await-in-loop
      expect(await p.publishIfAllowed(auth, ARTICLE, 'a1')).toBe(false);
    }

    // A subject-aware caller on a type without draft & publish has no status to gate
    const auth = await authOf([{ action: `${NOTE}.update`, conditions: mine }]);

    for (const requested of [undefined, 'draft', 'published'] as const) {
      // eslint-disable-next-line no-await-in-loop
      expect(await p.resolveWriteStatus(auth, NOTE, { requested, documentId: 'n1' })).toEqual({
        status: requested,
        publishAfterCreate: false,
      });
    }

    expect(await p.publishIfAllowed(auth, NOTE, 'n1')).toBe(false);
    // A uid that is not a content type's, whatever the registry's inherited keys say
    expect(
      await p.resolveWriteStatus(auth, 'constructor' as never, { requested: 'published' })
    ).toEqual({ status: 'published', publishAfterCreate: false });
    expect(documents).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  describe('resolves the three publish states', () => {
    it('writes a draft when the caller has no publish row, or none of its conditions holds', async () => {
      const without = await authOf([{ action: `${ARTICLE}.update`, conditions: mine }]);
      const failing = await authOf([publishRow([{ name: 'test.never' }])]);

      for (const auth of [without, failing]) {
        for (const requested of [undefined, 'published'] as const) {
          for (const documentId of [undefined, 'a1']) {
            // eslint-disable-next-line no-await-in-loop
            expect(await p.resolveWriteStatus(auth, ARTICLE, { requested, documentId })).toEqual({
              status: 'draft',
              publishAfterCreate: false,
            });
          }
        }
      }

      // Decided from the rows alone: nothing is looked up
      expect(documents).not.toHaveBeenCalled();
    });

    it('writes a draft when one is asked for, with nothing to note', async () => {
      const auth = await authOf([publishRow()]);
      const none = await authOf([]);

      for (const caller of [auth, none]) {
        // eslint-disable-next-line no-await-in-loop
        expect(await p.resolveWriteStatus(caller, ARTICLE, { requested: 'draft' })).toEqual({
          status: 'draft',
          publishAfterCreate: false,
        });
      }

      expect(record).not.toHaveBeenCalled();
    });

    it('gives an unconditioned publish what was asked for, published by default', async () => {
      const auth = await authOf([publishRow()]);

      expect(await p.resolveWriteStatus(auth, ARTICLE, {})).toEqual({
        status: 'published',
        publishAfterCreate: false,
      });
      expect(await p.resolveWriteStatus(auth, ARTICLE, { requested: 'published' })).toEqual({
        status: 'published',
        publishAfterCreate: false,
      });
      expect(
        await p.resolveWriteStatus(auth, ARTICLE, { requested: 'published', documentId: 'a1' })
      ).toEqual({ status: 'published', publishAfterCreate: false });

      // The row holds for every entry: there is nothing to match
      expect(documents).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('writes the draft of an update under a conditioned publish first, and has the controller publish it as written', async () => {
      const auth = await authOf([publishRow(mine)]);

      store = [
        { documentId: 'a1', owner: 'u1', status: 'draft' },
        { documentId: 'a1', owner: 'u1', status: 'published' },
        { documentId: 'a2', owner: 'u1', status: 'draft' },
        { documentId: 'a2', owner: 'u2', status: 'published' },
        { documentId: 'a3', owner: 'u2', status: 'draft' },
      ];

      // Whatever the stored versions are now: the write may change a condition field, so the
      // decision is on the draft as written (publishIfAllowed, in the write's transaction)
      for (const documentId of ['a1', 'a2', 'a3', 'nothing']) {
        for (const requested of [undefined, 'published'] as const) {
          // eslint-disable-next-line no-await-in-loop
          expect(await p.resolveWriteStatus(auth, ARTICLE, { documentId, requested })).toEqual({
            status: 'draft',
            publishAfterCreate: true,
          });
        }
      }

      // Nothing is looked up before the write, and nothing is forced yet
      expect(documents).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('publishes after an update only when the draft as written and the published version it replaces match, in the locale given', async () => {
      const auth = await authOf([publishRow(mine)]);

      store = [
        { documentId: 'a1', owner: 'u1', status: 'draft' },
        { documentId: 'a1', owner: 'u1', status: 'published' },
        { documentId: 'a2', owner: 'u1', status: 'draft' },
        { documentId: 'a2', owner: 'u2', status: 'published' },
      ];

      expect(await p.publishIfAllowed(auth, ARTICLE, 'a1', { locale: 'fr' })).toBe(true);
      expect(counts).toEqual([
        { filters: { $and: [{ documentId: 'a1' }, MINE] }, status: 'draft', locale: 'fr' },
        { filters: { $and: [{ documentId: 'a1' }, MINE] }, status: 'published', locale: 'fr' },
        { filters: { documentId: 'a1' }, status: 'draft', locale: 'fr' },
        { filters: { documentId: 'a1' }, status: 'published', locale: 'fr' },
      ]);

      // The draft is the caller's and the published version it would replace is not
      expect(await p.publishIfAllowed(auth, ARTICLE, 'a2', { locale: 'fr' })).toBe(false);
      expect(publish).toHaveBeenCalledTimes(1);
    });

    it('writes a draft first on a create of a conditioned publish, and has the controller publish it', async () => {
      const auth = await authOf([publishRow(mine)]);

      for (const requested of [undefined, 'published'] as const) {
        // eslint-disable-next-line no-await-in-loop
        expect(await p.resolveWriteStatus(auth, ARTICLE, { requested })).toEqual({
          status: 'draft',
          publishAfterCreate: true,
        });
        // eslint-disable-next-line no-await-in-loop
        expect(await p.resolveWriteStatus(auth, ARTICLE, { requested, locale: 'fr' })).toEqual({
          status: 'draft',
          publishAfterCreate: true,
        });
      }

      // The entry doesn't exist to be matched yet
      expect(documents).not.toHaveBeenCalled();
      // And it is not a forced draft until publishIfAllowed says it stays one
      expect(record).not.toHaveBeenCalled();
    });
  });

  describe('publishIfAllowed', () => {
    it('publishes after create only when the new entry matches the publish condition', async () => {
      const auth = await authOf([publishRow(mine)]);

      store = [
        { documentId: 'a1', owner: 'u1', status: 'draft' },
        { documentId: 'a2', owner: 'u2', status: 'draft' },
      ];

      expect(await p.publishIfAllowed(auth, ARTICLE, 'a1', { locale: 'fr' })).toBe(true);
      expect(publish).toHaveBeenCalledTimes(1);
      expect(publish).toHaveBeenCalledWith({ documentId: 'a1', locale: 'fr' });

      expect(await p.publishIfAllowed(auth, ARTICLE, 'a2', { locale: 'fr' })).toBe(false);
      expect(await p.publishIfAllowed(auth, ARTICLE, 'nothing')).toBe(false);
      expect(publish).toHaveBeenCalledTimes(1);

      // No locale given: none is sent, so the Document Service takes the default one
      await p.publishIfAllowed(auth, ARTICLE, 'a1');

      expect(publish).toHaveBeenLastCalledWith({ documentId: 'a1' });
    });

    it('publishes an unconditioned publish, and never one the caller has no row for', async () => {
      store = [{ documentId: 'a1', owner: 'u2', status: 'draft' }];

      expect(await p.publishIfAllowed(await authOf([publishRow()]), ARTICLE, 'a1')).toBe(true);
      expect(publish).toHaveBeenCalledTimes(1);

      const noRow = await authOf([{ action: `${ARTICLE}.update` }]);
      const failing = await authOf([publishRow([{ name: 'test.never' }])]);

      expect(await p.publishIfAllowed(noRow, ARTICLE, 'a1')).toBe(false);
      expect(await p.publishIfAllowed(failing, ARTICLE, 'a1')).toBe(false);
      expect(publish).toHaveBeenCalledTimes(1);
    });
  });

  it('records write-as-draft for each forced draft', async () => {
    const without = await authOf([{ action: `${ARTICLE}.update` }]);
    const conditioned = await authOf([publishRow(mine)]);

    store = [
      { documentId: 'a1', owner: 'u1', status: 'draft' },
      { documentId: 'a2', owner: 'u2', status: 'draft' },
    ];

    // No publish row: forced
    await p.resolveWriteStatus(without, ARTICLE, { requested: 'published' });
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenLastCalledWith(without, { kind: 'write-as-draft', uid: ARTICLE });

    // A draft that stays one after its write (a create, or an update the condition doesn't match
    // as written): forced
    await p.publishIfAllowed(conditioned, ARTICLE, 'a2');
    expect(record).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenLastCalledWith(conditioned, { kind: 'write-as-draft', uid: ARTICLE });

    // Not forced: asked for, published, or written for the controller to publish
    await p.resolveWriteStatus(conditioned, ARTICLE, { requested: 'draft', documentId: 'a2' });
    await p.resolveWriteStatus(conditioned, ARTICLE, { documentId: 'a2' });
    await p.resolveWriteStatus(conditioned, ARTICLE, { documentId: 'a1' });
    await p.resolveWriteStatus(conditioned, ARTICLE, {});
    await p.publishIfAllowed(conditioned, ARTICLE, 'a1');
    expect(record).toHaveBeenCalledTimes(2);
  });
});
