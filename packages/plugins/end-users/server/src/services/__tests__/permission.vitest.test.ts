import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Core, Modules } from '@strapi/types';

import { PERMISSION_UID, ROLE_UID } from '../../constants';
import permissionService from '../permission';

type Row = Record<string, unknown>;
type Definition = Modules.ContentAPI.ContentApiConditionDefinition;
type Where = { documentId?: { $in?: string[] } | string };

const row = (i: number) => ({
  action: `api::note.note.action${i}`,
  subject: null,
  properties: {},
  conditions: [],
});

/**
 * A fake of the part of the database layer the service uses. `query(uid)` hands back the same
 * object every time, so a test can ask what was called on the permission table.
 */
const setup = ({
  role = { id: 7 } as { id: number } | null,
  conditions = new Map<string, { definition: Definition }>(),
} = {}) => {
  const queries = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();

  const query = vi.fn((uid: string) => {
    if (!queries.has(uid)) {
      queries.set(uid, {
        findOne: vi.fn(),
        findMany: vi.fn(async () => []),
        createMany: vi.fn(async ({ data }: { data: Row[] }) => ({ count: data.length, ids: [] })),
        update: vi.fn(async () => ({ id: 1 })),
        deleteMany: vi.fn(async ({ where }: { where: Where }) => ({
          count: ((where.documentId as { $in: string[] }).$in ?? []).length,
        })),
      });
    }

    return queries.get(uid) as Record<string, ReturnType<typeof vi.fn>>;
  });

  query(ROLE_UID).findOne.mockResolvedValue(role);

  // What happened, in order, so a test can say what came after the commit
  const events: string[] = [];

  /**
   * A transaction like Strapi's: the callback gets `onCommit`, and what it registers runs once the
   * callback has resolved and the transaction has committed, and never when the callback throws.
   */
  const transaction = vi.fn(
    async (work: (hooks: { onCommit: (cb: () => void) => void }) => Promise<unknown>) => {
      const afterCommit: Array<() => void> = [];

      try {
        const result = await work({ onCommit: (cb) => afterCommit.push(cb) });

        events.push('commit');
        afterCommit.forEach((cb) => cb());

        return result;
      } catch (error) {
        events.push('rollback');

        throw error;
      }
    }
  );

  const invalidate = vi.fn(() => {
    events.push('invalidate');
  });
  const service = vi.fn((name: string) => {
    if (name !== 'ability') throw new Error(`unexpected service ${name}`);

    return { invalidate };
  });
  const plugin = vi.fn(() => ({ service }));

  // Core's: the content type whose controller owns the action, when it is one
  const subjectOf = (action: string) =>
    action.startsWith('api::note.note.') ? 'api::note.note' : null;

  const strapi = {
    db: { query, transaction },
    plugin,
    contentAPI: {
      permissions: {
        subjectOf,
        providers: { condition: { get: (name: string) => conditions.get(name) } },
      },
    },
  } as unknown as Core.Strapi;
  const permission = permissionService({ strapi });

  return {
    permission,
    query,
    transaction,
    invalidate,
    events,
    plugin,
    permissions: query(PERMISSION_UID),
    roles: query(ROLE_UID),
  };
};

describe('permission service', () => {
  describe('applyDiff', () => {
    let ctx: ReturnType<typeof setup>;

    beforeEach(() => {
      ctx = setup();
    });

    it('applies a diff in one transaction', async () => {
      const { permission, transaction, permissions } = ctx;

      await permission.applyDiff('role1', {
        create: [row(1), row(2)],
        update: [{ documentId: 'p1', action: 'api::note.note.find' }],
        delete: ['p2'],
      });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permissions.createMany).toHaveBeenCalledTimes(1);
      expect(permissions.update).toHaveBeenCalledTimes(1);
      expect(permissions.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('does all of its writing inside the transaction', async () => {
      const { permission, transaction, permissions } = ctx;
      let open = false;
      const inside: boolean[] = [];

      transaction.mockImplementation(async (work) => {
        open = true;

        try {
          return await work({ onCommit() {} });
        } finally {
          open = false;
        }
      });

      const record = (mock: ReturnType<typeof vi.fn>) => {
        const original = mock.getMockImplementation() as (...args: unknown[]) => Promise<unknown>;

        mock.mockImplementation(async (...args: unknown[]) => {
          inside.push(open);

          return original(...args);
        });
      };

      record(permissions.createMany);
      record(permissions.update);
      record(permissions.deleteMany);

      await permission.applyDiff('role1', {
        create: [row(1)],
        update: [{ documentId: 'p1', subject: 'api::note.note' }],
        delete: ['p2'],
      });

      expect(inside).toEqual([true, true, true]);
    });

    it('never deletes permissions when the diff has none to delete', async () => {
      const { permission, permissions } = ctx;

      await permission.applyDiff('role1', { create: [], update: [], delete: [] });

      expect(permissions.deleteMany).not.toHaveBeenCalled();
      expect(permissions.createMany).not.toHaveBeenCalled();
      expect(permissions.update).not.toHaveBeenCalled();
    });

    it('splits large creates into chunks of 500', async () => {
      const { permission, permissions, transaction } = ctx;

      await permission.applyDiff('role1', {
        create: Array.from({ length: 1201 }, (_, i) => row(i)),
        update: [],
        delete: [],
      });

      expect(permissions.createMany).toHaveBeenCalledTimes(3);
      expect(permissions.createMany.mock.calls.map(([{ data }]) => (data as Row[]).length)).toEqual(
        [500, 500, 201]
      );
      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('splits large deletes into chunks of 500', async () => {
      const { permission, permissions } = ctx;

      await permission.applyDiff('role1', {
        create: [],
        update: [],
        delete: Array.from({ length: 1001 }, (_, i) => `p${i}`),
      });

      expect(
        permissions.deleteMany.mock.calls.map(
          ([{ where }]) => ((where as Where).documentId as { $in: string[] }).$in.length
        )
      ).toEqual([500, 500, 1]);
    });

    it('links every created row to the role', async () => {
      const { permission, permissions, roles } = ctx;

      await permission.applyDiff('role1', { create: [row(1), row(2)], update: [], delete: [] });

      expect(roles.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId: 'role1' } })
      );
      expect(permissions.createMany.mock.calls[0][0].data).toEqual([
        { ...row(1), role: 7, publishedAt: expect.any(Date) },
        { ...row(2), role: 7, publishedAt: expect.any(Date) },
      ]);
    });

    it('publishes every created row, as the Document Service does for a type without drafts', async () => {
      const { permission, permissions } = ctx;

      await permission.applyDiff('role1', {
        create: Array.from({ length: 501 }, (_, i) => row(i)),
        update: [],
        delete: [],
      });

      const dates = permissions.createMany.mock.calls.flatMap(([{ data }]) =>
        (data as Array<{ publishedAt: Date }>).map((created) => created.publishedAt)
      );

      expect(dates).toHaveLength(501);
      expect(dates.every((date) => date instanceof Date && !Number.isNaN(date.getTime()))).toBe(
        true
      );
      // One moment for the whole diff, whatever chunk a row is in
      expect(new Set(dates.map((date) => date.getTime())).size).toBe(1);
    });

    it('fills in what the first version of the plugin left out: no subject, no field rules, no conditions', async () => {
      const { permission, permissions } = ctx;

      await permission.applyDiff('role1', {
        create: [{ action: 'plugin::end-users.me.find' } as never],
        update: [],
        delete: [],
      });

      expect(permissions.createMany.mock.calls[0][0].data).toEqual([
        {
          action: 'plugin::end-users.me.find',
          subject: null,
          properties: {},
          conditions: [],
          role: 7,
          publishedAt: expect.any(Date),
        },
      ]);
    });

    it('only deletes rows of this role', async () => {
      const { permission, permissions } = ctx;

      await permission.applyDiff('role1', { create: [], update: [], delete: ['p1', 'p2'] });

      expect(permissions.deleteMany).toHaveBeenCalledWith({
        where: { role: { id: 7 }, documentId: { $in: ['p1', 'p2'] } },
      });
    });

    it('only updates a row of this role, and only the fields it was given', async () => {
      const { permission, permissions } = ctx;

      await permission.applyDiff('role1', {
        create: [],
        update: [
          { documentId: 'p1', subject: 'api::note.note', conditions: [{ name: 'is-owner' }] },
        ],
        delete: [],
      });

      expect(permissions.update).toHaveBeenCalledWith({
        where: { role: { id: 7 }, documentId: 'p1' },
        data: { subject: 'api::note.note', conditions: [{ name: 'is-owner' }] },
      });
    });

    it('refuses to update a row that is not on this role, and keeps nothing', async () => {
      const { permission, permissions } = ctx;

      permissions.update.mockResolvedValueOnce(null);

      await expect(
        permission.applyDiff('role1', {
          create: [row(1)],
          update: [{ documentId: 'elsewhere', action: 'x.y.z' }],
          delete: [],
        })
      ).rejects.toMatchObject({ name: 'NotFoundError' });
    });

    it('refuses a role that does not exist, before writing anything', async () => {
      const { permission, permissions } = setup({ role: null });

      await expect(
        permission.applyDiff('nope', { create: [row(1)], update: [], delete: ['p1'] })
      ).rejects.toMatchObject({ name: 'NotFoundError' });

      expect(permissions.createMany).not.toHaveBeenCalled();
      expect(permissions.deleteMany).not.toHaveBeenCalled();
    });

    describe('the permissions the ability service keeps', () => {
      it('are cleared once the transaction has committed, and once', async () => {
        const { permission, invalidate, events } = ctx;

        await permission.applyDiff('role1', {
          create: [row(1)],
          update: [{ documentId: 'p1', action: 'api::note.note.find' }],
          delete: ['p2'],
        });

        expect(invalidate).toHaveBeenCalledTimes(1);
        // Not while the writes are still uncommitted: a read in between would keep the old rows
        expect(events).toEqual(['commit', 'invalidate']);
      });

      it('are not cleared when the transaction rolls back', async () => {
        const { permission, permissions, invalidate, events } = ctx;

        permissions.createMany.mockRejectedValueOnce(new Error('disk full'));

        await expect(
          permission.applyDiff('role1', { create: [row(1)], update: [], delete: [] })
        ).rejects.toThrow('disk full');

        expect(invalidate).not.toHaveBeenCalled();
        expect(events).toEqual(['rollback']);
      });

      it('are not cleared when the diff is refused after its writes, which are then undone', async () => {
        const { permission, permissions, invalidate, events } = ctx;

        permissions.findMany.mockResolvedValueOnce([
          { action: 'find', subject: null },
          { action: 'find', subject: null },
        ]);

        await expect(
          permission.applyDiff('role1', { create: [row(1)], update: [], delete: [] })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        expect(permissions.createMany).toHaveBeenCalledTimes(1);
        expect(invalidate).not.toHaveBeenCalled();
        expect(events).toEqual(['rollback']);
      });

      it('are not cleared for a diff that is refused, or for a role that is not there', async () => {
        const { permission, invalidate } = ctx;

        await expect(
          permission.applyDiff('role1', {
            create: [{ action: '' } as never],
            update: [],
            delete: [],
          })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        const missing = setup({ role: null });

        await expect(
          missing.permission.applyDiff('nope', { create: [row(1)], update: [], delete: [] })
        ).rejects.toMatchObject({ name: 'NotFoundError' });

        expect(invalidate).not.toHaveBeenCalled();
        expect(missing.invalidate).not.toHaveBeenCalled();
      });
    });

    it('lets an error out of the transaction, so it rolls back', async () => {
      const { permission, permissions } = ctx;

      permissions.createMany.mockRejectedValueOnce(new Error('disk full'));

      await expect(
        permission.applyDiff('role1', { create: [row(1)], update: [], delete: [] })
      ).rejects.toThrow('disk full');
    });

    describe('a row that is not a permission', () => {
      const refused = async (diff: Record<string, unknown>) => {
        const { permission, transaction } = setup();

        await expect(
          permission.applyDiff('role1', { create: [], update: [], delete: [], ...diff } as never)
        ).rejects.toMatchObject({ name: 'ValidationError' });

        // Refused before anything is opened, let alone written
        expect(transaction).not.toHaveBeenCalled();
      };

      it('needs an action', async () => {
        await refused({ create: [{ subject: null }] });
        await refused({ create: [{ action: '' }] });
        await refused({ create: [{ action: 42 }] });
      });

      it('takes a subject that is a string or null', async () => {
        await refused({ create: [{ action: 'a.b.c', subject: 42 }] });
      });

      it('takes properties that are an object', async () => {
        await refused({ create: [{ action: 'a.b.c', properties: 'all' }] });
        await refused({ create: [{ action: 'a.b.c', properties: [] }] });
        await refused({ create: [{ action: 'a.b.c', properties: { fields: 'title' } }] });
        await refused({ create: [{ action: 'a.b.c', properties: { populateDepth: 'deep' } }] });
      });

      it('takes conditions that are a list of named conditions', async () => {
        await refused({ create: [{ action: 'a.b.c', conditions: 'is-owner' }] });
        await refused({ create: [{ action: 'a.b.c', conditions: ['is-owner'] }] });
        await refused({ create: [{ action: 'a.b.c', conditions: [{ params: {} }] }] });
      });

      it('is refused in an update too, and an update needs the document id', async () => {
        await refused({ update: [{ documentId: 'p1', action: '' }] });
        await refused({ update: [{ action: 'a.b.c' }] });
        await refused({ update: [{ documentId: 'p1', conditions: 'x' }] });
      });

      it('is refused as an id to delete when it is not a string', async () => {
        await refused({ delete: [42] });
      });

      it('is refused over a size bound, in a created row and in an update', async () => {
        const names = (count: number, name: (n: number) => unknown) =>
          Array.from({ length: count }, (_, n) => name(n));

        await refused({ create: names(5_001, (n) => row(n)) });
        await refused({ update: names(5_001, (n) => ({ documentId: `p${n}` })) });
        await refused({ delete: names(5_001, (n) => `p${n}`) });
        await refused({
          create: [{ action: 'a.b.c', properties: { fields: names(1_001, (n) => `f${n}`) } }],
        });
        await refused({
          update: [{ documentId: 'p1', conditions: names(21, () => ({ name: 'is-owner' })) }],
        });
        await refused({
          create: [
            { action: 'a.b.c', conditions: [{ name: 'c', params: { v: 'x'.repeat(4_096) } }] },
          ],
        });
      });
    });

    it('takes the full shape as it is', async () => {
      const { permission, permissions } = setup();
      const full = {
        action: 'find',
        subject: 'api::note.note',
        properties: { fields: ['title', 'body'], locales: null, populateDepth: 2 },
        conditions: [{ name: 'plugin::end-users.is-owner', params: { field: 'owner' } }],
      };

      await permission.applyDiff('role1', { create: [full], update: [], delete: [] });

      expect(permissions.createMany.mock.calls[0][0].data).toEqual([
        { ...full, role: 7, publishedAt: expect.any(Date) },
      ]);
    });

    it('stores properties and conditions as the three and two keys it knows, and no others', async () => {
      const { permission, permissions } = setup();

      await permission.applyDiff('role1', {
        create: [
          // As an import file arrives: JSON, where `__proto__` is a key like any other
          JSON.parse(`{
            "action": "find",
            "subject": "api::note.note",
            "properties": { "fields": ["title"], "unknown": 1, "__proto__": { "polluted": true } },
            "conditions": [{ "name": "is-owner", "unknown": 1, "__proto__": { "polluted": true } }]
          }`),
        ],
        update: [],
        delete: [],
      });

      const [stored] = permissions.createMany.mock.calls[0][0].data as Array<{
        properties: Record<string, unknown>;
        conditions: Array<Record<string, unknown>>;
      }>;

      expect(stored.properties).toEqual({ fields: ['title'] });
      expect(stored.conditions).toEqual([{ name: 'is-owner' }]);
      expect(Object.keys(stored.properties)).toEqual(['fields']);
      expect(Object.prototype.hasOwnProperty.call(stored.properties, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(stored.conditions[0], '__proto__')).toBe(false);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    describe('what a diff is', () => {
      const refusedBeforeAnything = async (diff: unknown) => {
        const { permission, transaction } = setup();

        await expect(permission.applyDiff('role1', diff as never)).rejects.toMatchObject({
          name: 'ValidationError',
        });
        expect(transaction).not.toHaveBeenCalled();
      };

      it('is refused when it is not an object, rather than done as nothing', async () => {
        await refusedBeforeAnything([{ action: 'a.b.c' }]);
        await refusedBeforeAnything(null);
        await refusedBeforeAnything(undefined);
        await refusedBeforeAnything('create');
      });

      it('is refused as the whole list of permissions the plugin it replaces took', async () => {
        await refusedBeforeAnything({ permissions: [{ action: 'a.b.c' }] });
      });

      it('is refused with a key it does not know, or a part that is not a list', async () => {
        await refusedBeforeAnything({ create: [], update: [], delete: [], upsert: [] });
        await refusedBeforeAnything({ create: { action: 'a.b.c' }, update: [], delete: [] });
        await refusedBeforeAnything({ create: [], update: 'p1', delete: [] });
        await refusedBeforeAnything({ create: [], update: [], delete: 'p1' });
      });

      it('may leave a part out: it is then nothing to do', async () => {
        const { permission, permissions } = setup();

        await permission.applyDiff('role1', { create: [row(1)] } as never);

        expect(permissions.createMany).toHaveBeenCalledTimes(1);
        expect(permissions.update).not.toHaveBeenCalled();
        expect(permissions.deleteMany).not.toHaveBeenCalled();
      });
    });

    describe('the same action on the same subject twice', () => {
      const pair = [
        { ...row(1), action: 'api::note.note.find', subject: 'api::note.note' },
        { ...row(2), action: 'api::note.note.find', subject: 'api::note.note' },
      ];

      it('is refused in the diff itself, before anything is opened, naming the action and subject', async () => {
        const { permission, transaction } = setup();

        await expect(
          permission.applyDiff('role1', { create: pair, update: [], delete: [] })
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringMatching(/api::note\.note\.find.*api::note\.note/),
        });
        expect(transaction).not.toHaveBeenCalled();
      });

      it('is refused for two rows with no subject, which no database index would catch', async () => {
        const { permission, transaction } = setup();

        await expect(
          permission.applyDiff('role1', {
            create: [
              { action: 'plugin::end-users.me.find' } as never,
              { action: 'plugin::end-users.me.find' } as never,
            ],
            update: [],
            delete: [],
          })
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringContaining('no subject'),
        });
        expect(transaction).not.toHaveBeenCalled();
      });

      it('is refused when a new row repeats one the role already has, and the error leaves the transaction', async () => {
        const { permission, permissions, transaction } = setup();

        // The role after the writes: the row it had, and the one the diff just made
        permissions.findMany.mockResolvedValueOnce([
          { id: 1, action: 'api::note.note.find', subject: 'api::note.note' },
          { id: 2, action: 'api::note.note.find', subject: 'api::note.note' },
        ]);

        await expect(
          permission.applyDiff('role1', { create: [pair[0]], update: [], delete: [] })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        expect(transaction).toHaveBeenCalledTimes(1);
        // It looked at this role's rows only, and read their ids: the filter on the role is a join,
        // the database layer selects DISTINCT for it, and without the id two equal rows would come
        // back as one
        expect(permissions.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { role: { id: 7 } },
            select: expect.arrayContaining(['id', 'action', 'subject']),
          })
        );
      });

      it('is refused when an update makes two rows the same', async () => {
        const { permission, permissions } = setup();

        permissions.findMany.mockResolvedValueOnce([
          { action: 'find', subject: null },
          { action: 'find', subject: null },
        ]);

        await expect(
          permission.applyDiff('role1', {
            create: [],
            update: [{ documentId: 'p2', action: 'find' }],
            delete: [],
          })
        ).rejects.toMatchObject({ name: 'ValidationError' });
      });

      it('is not refused when the diff deletes the old row and creates the new one, or the subjects differ', async () => {
        const { permission, permissions } = setup();

        // After the writes the role has one of each
        permissions.findMany.mockResolvedValueOnce([
          { action: 'find', subject: 'api::a.a' },
          { action: 'find', subject: 'api::b.b' },
          { action: 'find', subject: null },
        ]);

        await expect(
          permission.applyDiff('role1', {
            create: [{ ...row(1), action: 'find', subject: 'api::b.b' }],
            update: [],
            delete: ['old'],
          })
        ).resolves.toBeUndefined();
      });

      it('is not looked for when the diff only deletes or only changes what a row says', async () => {
        const { permission, permissions } = setup();

        await permission.applyDiff('role1', { create: [], update: [], delete: ['p1'] });
        await permission.applyDiff('role1', {
          create: [],
          update: [{ documentId: 'p1', conditions: [{ name: 'is-owner' }] }],
          delete: [],
        });

        expect(permissions.findMany).not.toHaveBeenCalled();
      });
    });

    describe('the length of an action and a subject', () => {
      const edge = 'x'.repeat(255);
      const long = 'x'.repeat(256);

      it('takes 255 characters, as a varchar(255) does', async () => {
        const { permission, permissions } = setup();

        await permission.applyDiff('role1', {
          create: [{ ...row(1), action: edge, subject: edge }],
          update: [],
          delete: [],
        });

        expect(permissions.createMany).toHaveBeenCalledTimes(1);
      });

      it('refuses 256 with a validation error, so it is a 400 and never the 500 of the database', async () => {
        for (const diff of [
          { create: [{ ...row(1), action: long }], update: [], delete: [] },
          { create: [{ ...row(1), subject: long }], update: [], delete: [] },
          { create: [], update: [{ documentId: 'p1', action: long }], delete: [] },
          { create: [], update: [{ documentId: 'p1', subject: long }], delete: [] },
        ]) {
          const { permission, transaction } = setup();

          // eslint-disable-next-line no-await-in-loop
          await expect(permission.applyDiff('role1', diff)).rejects.toMatchObject({
            name: 'ValidationError',
            message: expect.stringContaining('255'),
          });
          expect(transaction).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe('findForRoles', () => {
    it('answers nothing, without asking the database, when there are no roles', async () => {
      const { permission, permissions } = setup();

      await expect(permission.findForRoles([])).resolves.toEqual([]);
      expect(permissions.findMany).not.toHaveBeenCalled();
    });

    it('reads the rows of the roles and says which role each belongs to', async () => {
      const { permission, permissions } = setup();

      permissions.findMany.mockResolvedValueOnce([
        {
          id: 1,
          documentId: 'p1',
          action: 'api::note.note.find',
          subject: null,
          properties: {},
          conditions: [],
          role: { documentId: 'role1', name: 'Authenticated' },
        },
      ]);

      const found = await permission.findForRoles(['role1', 'role2']);

      expect(permissions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: { documentId: { $in: ['role1', 'role2'] } } } })
      );
      expect(found).toEqual([
        {
          documentId: 'p1',
          action: 'api::note.note.find',
          subject: null,
          properties: {},
          conditions: [],
          roleDocumentId: 'role1',
          roleName: 'Authenticated',
        },
      ]);
    });

    it('gives a row stored without properties or conditions the empty ones', async () => {
      const { permission, permissions } = setup();

      permissions.findMany.mockResolvedValueOnce([
        { documentId: 'p1', action: 'a.b.c', role: { documentId: 'r', name: 'R' } },
      ]);

      const [found] = await permission.findForRoles(['r']);

      expect(found).toMatchObject({ subject: null, properties: {}, conditions: [] });
    });
  });
});
