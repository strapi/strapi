import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { PERMISSION_UID, PLUGIN_ID, ROLE_UID, USER_UID } from '../../constants';
import type { BuilderConditionV2 } from '../../../../shared/builder/types';
import type { PermissionRow } from '../../utils/permission-row';
import { builderRecordsOf } from '../../utils/builder/registry';
import roleService from '../role';

type Row = Record<string, unknown>;
type Mock = ReturnType<typeof vi.fn>;
type Problem = { index: number; action: string; key: string; reason: string };

const stored = (overrides: Row = {}) => ({
  id: 1,
  documentId: 'role-a',
  name: 'Editors',
  description: null,
  type: 'custom',
  requireTwoFactor: false,
  createdAt: '2026-10-28T00:00:00.000Z',
  updatedAt: '2026-10-28T00:00:00.000Z',
  ...overrides,
});

/**
 * A fake of what the service reaches for: the database layer (`query(uid)` returns the same object
 * every time), the Document Service, and the permission service.
 */
const setup = () => {
  const queries = new Map<string, Record<string, Mock>>();

  const query = vi.fn((uid: string) => {
    if (!queries.has(uid)) {
      queries.set(uid, {
        findOne: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        update: vi.fn(async () => ({})),
        // The revision step of a save: one row changed unless a test says the revision is stale
        updateMany: vi.fn(async () => ({ count: 1 })),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      });
    }

    return queries.get(uid) as Record<string, Mock>;
  });

  const documentsByUid = new Map<string, Record<string, Mock>>();
  const documents = vi.fn((uid: string) => {
    if (!documentsByUid.has(uid)) {
      documentsByUid.set(uid, {
        create: vi.fn(async ({ data }: { data: Row }) => ({ documentId: 'new-role', ...data })),
        update: vi.fn(async () => ({})),
        delete: vi.fn(async () => ({ entries: [{}] })),
      });
    }

    return documentsByUid.get(uid) as Record<string, Mock>;
  });

  const permission = {
    applyDiff: vi.fn(async () => {}),
    findForRoles: vi.fn(async () => [] as Row[]),
    checkRows: vi.fn(),
    // The rows the engine could not trust: none, unless a test says which
    findProblems: vi.fn<(rows: PermissionRow[]) => Problem[]>(() => []),
  };

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
    if (name === 'ability') return { invalidate };
    if (name !== 'permission') throw new Error(`unexpected service ${name}`);
    return permission;
  });
  const plugin = vi.fn(() => ({ service }));

  // Core's: the content type whose controller owns the action, when it is one
  const subjectOf = vi.fn((action: string) =>
    action.startsWith('api::note.note.') ? 'api::note.note' : null
  );

  const strapi = {
    db: { query, transaction },
    documents,
    plugin,
    contentAPI: { permissions: { subjectOf } },
  } as unknown as Core.Strapi;

  return {
    role: roleService({ strapi }),
    strapi,
    plugin,
    permission,
    transaction,
    invalidate,
    events,
    roles: query(ROLE_UID),
    users: query(USER_UID),
    permissions: query(PERMISSION_UID),
    roleDocuments: documents(ROLE_UID),
  };
};

describe('role service', () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe('ensureDefaults', () => {
    it('creates Public and Authenticated when neither exists', async () => {
      const { role, roleDocuments } = ctx;

      await role.ensureDefaults();

      expect(roleDocuments.create).toHaveBeenCalledTimes(2);
      expect(roleDocuments.create.mock.calls.map(([{ data }]) => data.type).sort()).toEqual([
        'authenticated',
        'public',
      ]);
      expect(roleDocuments.create.mock.calls.map(([{ data }]) => data.name).sort()).toEqual([
        'Authenticated',
        'Public',
      ]);
    });

    it('reports both as created when this call inserted both', async () => {
      const { role } = ctx;

      await expect(role.ensureDefaults()).resolves.toEqual({
        created: { public: true, authenticated: true },
      });
    });

    it('creates only the one that is missing', async () => {
      const { role, roles, roleDocuments } = ctx;

      roles.findOne.mockImplementation(async ({ where }: { where: { type: string } }) =>
        where.type === 'public' ? stored({ type: 'public', name: 'Public' }) : null
      );

      await role.ensureDefaults();

      expect(roleDocuments.create).toHaveBeenCalledTimes(1);
      expect(roleDocuments.create.mock.calls[0][0].data.type).toBe('authenticated');
    });

    it('reports only the role it inserted as created', async () => {
      const { role, roles } = ctx;

      roles.findOne.mockImplementation(async ({ where }: { where: { type: string } }) =>
        where.type === 'public' ? stored({ type: 'public', name: 'Public' }) : null
      );

      await expect(role.ensureDefaults()).resolves.toEqual({
        created: { public: false, authenticated: true },
      });
    });

    it('creates nothing when both are there, however often it runs', async () => {
      const { role, roles, roleDocuments } = ctx;

      roles.findOne.mockResolvedValue(stored({ type: 'public' }));

      const first = await role.ensureDefaults();
      const second = await role.ensureDefaults();

      expect(roleDocuments.create).not.toHaveBeenCalled();
      // A role that was already there is not one this call created, however often it runs
      expect(first).toEqual({ created: { public: false, authenticated: false } });
      expect(second).toEqual({ created: { public: false, authenticated: false } });
    });

    // What the second of two instances is told when its insert hits the unique index on `name`
    // (the error each driver gives for `eu_roles_name_uq`), or when Strapi's own check sees the
    // other instance's row first
    it.each([
      [
        'SQLite',
        Object.assign(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: eu_roles.name'), {
          code: 'SQLITE_CONSTRAINT_UNIQUE',
        }),
      ],
      [
        'Postgres',
        Object.assign(
          new Error('duplicate key value violates unique constraint "eu_roles_name_uq"'),
          { code: '23505', constraint: 'eu_roles_name_uq' }
        ),
      ],
      [
        'MySQL',
        Object.assign(new Error("Duplicate entry 'Public' for key 'eu_roles.eu_roles_name_uq'"), {
          code: 'ER_DUP_ENTRY',
          errno: 1062,
        }),
      ],
      [
        "Strapi's own uniqueness check",
        new errors.ValidationError('This attribute must be unique', {
          errors: [{ path: ['name'], message: 'This attribute must be unique' }],
        }),
      ],
    ])(
      'accepts losing the race to another instance that booted at the same time: %s',
      async (_database, refusal) => {
        const { role, roles, roleDocuments } = ctx;
        let created = false;

        roleDocuments.create.mockImplementation(async () => {
          created = true;
          throw refusal;
        });
        roles.findOne.mockImplementation(async () =>
          created ? stored({ type: 'authenticated' }) : null
        );

        // Accepted, and not reported as created: the other instance inserted the role
        await expect(role.ensureDefaults()).resolves.toEqual({
          created: { public: false, authenticated: false },
        });
      }
    );

    it('reports the role it lost the race for as not created, and the one it won as created', async () => {
      const { role, roles, roleDocuments } = ctx;
      let lost = false;

      // Public is inserted by this call; another instance inserts Authenticated first
      roleDocuments.create.mockImplementation(async ({ data }: { data: { type: string } }) => {
        if (data.type === 'authenticated') {
          lost = true;
          throw Object.assign(
            new Error('duplicate key value violates unique constraint "eu_roles_name_uq"'),
            { code: '23505', constraint: 'eu_roles_name_uq' }
          );
        }

        return { documentId: 'public' };
      });
      roles.findOne.mockImplementation(async ({ where }: { where: { type: string } }) =>
        where.type === 'authenticated' && lost ? stored({ type: 'authenticated' }) : null
      );

      await expect(role.ensureDefaults()).resolves.toEqual({
        created: { public: true, authenticated: false },
      });
    });

    it('reports a role as not created when its insert threw, even if the role is there afterwards', async () => {
      const { role, roles, roleDocuments } = ctx;
      let attempted = false;

      roleDocuments.create.mockImplementation(async () => {
        attempted = true;
        throw new Error('the insert reported a failure after the row was written');
      });
      roles.findOne.mockImplementation(async () => (attempted ? stored({ type: 'public' }) : null));

      const { created } = await role.ensureDefaults();

      expect(created).toEqual({ public: false, authenticated: false });
    });

    it('looks for a built-in role oldest first, so that every caller picks the same one', async () => {
      const { role, roles } = ctx;

      roles.findOne.mockResolvedValue(stored({ type: 'public' }));

      await role.ensureDefaults();

      expect(roles.findOne).toHaveBeenCalledWith({
        where: { type: 'public' },
        orderBy: { id: 'asc' },
      });
      expect(roles.findOne).toHaveBeenCalledWith({
        where: { type: 'authenticated' },
        orderBy: { id: 'asc' },
      });
    });

    it('does not hide a failure that left the role missing', async () => {
      const { role, roleDocuments } = ctx;

      roleDocuments.create.mockRejectedValue(new Error('connection lost'));

      await expect(role.ensureDefaults()).rejects.toThrow('connection lost');
    });
  });

  describe('getDefault', () => {
    it('is the Authenticated role', async () => {
      const { role, roles } = ctx;

      roles.findOne.mockResolvedValueOnce(
        stored({ documentId: 'auth', name: 'Authenticated', type: 'authenticated' })
      );

      await expect(role.getDefault()).resolves.toMatchObject({
        documentId: 'auth',
        type: 'authenticated',
      });
      expect(roles.findOne).toHaveBeenCalledWith({
        where: { type: 'authenticated' },
        // Never the luck of the database, should there ever be two
        orderBy: { id: 'asc' },
      });
    });

    it('says so when the role is not there, rather than giving a user none', async () => {
      await expect(ctx.role.getDefault()).rejects.toThrow(/default role/i);
    });
  });

  describe('list', () => {
    it('counts the users of each role from the link table', async () => {
      const { role, roles, users } = ctx;

      roles.findMany.mockResolvedValueOnce([
        stored({ documentId: 'a', name: 'A' }),
        stored({ documentId: 'b', name: 'B' }),
      ]);
      users.count.mockImplementation(
        async ({ where }: { where: { roles: { documentId: string } } }) =>
          where.roles.documentId === 'a' ? 3 : 0
      );

      const list = await role.list();

      expect(list.map(({ documentId, usersCount }) => [documentId, usersCount])).toEqual([
        ['a', 3],
        ['b', 0],
      ]);
    });

    it('does not hand out database ids', async () => {
      const { role, roles } = ctx;

      roles.findMany.mockResolvedValueOnce([stored()]);

      expect((await role.list())[0]).not.toHaveProperty('id');
    });
  });

  describe('get', () => {
    it('answers the role with its permissions', async () => {
      const { role, roles, permission } = ctx;

      roles.findOne.mockResolvedValueOnce(stored());
      permission.findForRoles.mockResolvedValueOnce([
        {
          documentId: 'p1',
          action: 'a.b.c',
          subject: null,
          properties: {},
          conditions: [],
          roleDocumentId: 'role-a',
          roleName: 'Editors',
        },
      ]);

      const found = await role.get('role-a');

      expect(permission.findForRoles).toHaveBeenCalledWith(['role-a']);
      expect(found).toMatchObject({ documentId: 'role-a', name: 'Editors' });
      expect(found.permissions).toEqual([
        { documentId: 'p1', action: 'a.b.c', subject: null, properties: {}, conditions: [] },
      ]);
    });

    it('gives the users count, the revision and the problems of the stored rows', async () => {
      const { role, roles, users, permission } = ctx;
      const storedRow = (documentId: string, action: string) => ({
        documentId,
        action,
        subject: null,
        properties: {},
        conditions: [],
        roleDocumentId: 'role-a',
        roleName: 'Editors',
      });

      roles.findOne.mockResolvedValueOnce(stored({ revision: 4 }));
      users.count.mockResolvedValueOnce(3);
      permission.findForRoles.mockResolvedValueOnce([
        storedRow('p8', 'a.b.find'),
        storedRow('p9', 'a.b.update'),
      ]);
      permission.findProblems.mockReturnValueOnce([
        { index: 1, action: 'a.b.update', key: 'conditions', reason: 'it is not registered' },
      ]);

      const found = await role.get('role-a');

      expect(users.count).toHaveBeenCalledWith({ where: { roles: { documentId: 'role-a' } } });
      expect(permission.findProblems).toHaveBeenCalledWith([
        expect.objectContaining({ documentId: 'p8' }),
        expect.objectContaining({ documentId: 'p9' }),
      ]);
      expect(found).toMatchObject({ usersCount: 3, revision: 4 });
      // The problem names the stored row it is about, by its documentId
      expect(found.problems).toEqual([
        {
          documentId: 'p9',
          index: 1,
          action: 'a.b.update',
          key: 'conditions',
          reason: 'it is not registered',
        },
      ]);
    });

    it('names the builder conditions whose Who roles check names the role, with the match', async () => {
      const { role, roles, strapi } = ctx;
      const naming = (slug: string, checks: BuilderConditionV2['who']['checks']) =>
        ({
          version: 2,
          slug,
          displayName: `Condition ${slug}`,
          appliesTo: { kind: 'all' },
          inputs: [],
          who: { match: 'all', checks },
          which: { kind: 'group', match: 'all', items: [] },
          onSave: { stamp: [], locked: [] },
        }) as BuilderConditionV2;
      const records = builderRecordsOf(strapi);

      records.set('api::zed', {
        condition: naming('zed', [{ kind: 'roles', match: 'none', roles: ['Editors', 'Other'] }]),
        stale: [],
      });
      records.set('api::alpha', {
        condition: naming('alpha', [
          { kind: 'roles', match: 'any', roles: ['Editors'] },
          { kind: 'roles', match: 'none', roles: ['Editors'] },
        ]),
        stale: [],
      });
      records.set('api::elsewhere', {
        condition: naming('elsewhere', [{ kind: 'roles', match: 'any', roles: ['Other'] }]),
        stale: [],
      });

      roles.findOne.mockResolvedValueOnce(stored());

      await expect(role.get('role-a')).resolves.toMatchObject({
        namedBy: [
          { name: 'api::alpha', displayName: 'Condition alpha', match: 'any' },
          { name: 'api::alpha', displayName: 'Condition alpha', match: 'none' },
          { name: 'api::zed', displayName: 'Condition zed', match: 'none' },
        ],
      });
    });

    it('names no condition when none names the role', async () => {
      const { role, roles } = ctx;

      roles.findOne.mockResolvedValueOnce(stored());

      await expect(role.get('role-a')).resolves.toMatchObject({ namedBy: [] });
    });

    it('reads the revision of a role that has none yet (a row from before the column) as 0', async () => {
      const { role, roles } = ctx;

      roles.findOne.mockResolvedValueOnce(stored({ revision: null }));

      await expect(role.get('role-a')).resolves.toMatchObject({ revision: 0, problems: [] });
    });

    it('is a not found error for a role that is not there', async () => {
      await expect(ctx.role.get('nope')).rejects.toMatchObject({ name: 'NotFoundError' });
    });
  });

  describe('assertExists', () => {
    it('is a not found error for a role that is not there, and reads nothing but the role', async () => {
      const { role, roles, permission, users } = ctx;

      await expect(role.assertExists('nope')).rejects.toMatchObject({ name: 'NotFoundError' });
      expect(roles.findOne).toHaveBeenCalledWith({ where: { documentId: 'nope' } });
      expect(permission.findForRoles).not.toHaveBeenCalled();
      expect(users.count).not.toHaveBeenCalled();
    });

    it('resolves for a role that is there', async () => {
      ctx.roles.findOne.mockResolvedValueOnce(stored());

      await expect(ctx.role.assertExists('role-a')).resolves.toBeUndefined();
    });
  });

  describe('create', () => {
    it('makes a custom role, whatever type it is asked for', async () => {
      const { role, roles, roleDocuments } = ctx;

      roles.findOne.mockResolvedValue(stored({ documentId: 'new-role' }));

      await role.create({ name: ' Editors ', type: 'public' } as never);

      expect(roleDocuments.create).toHaveBeenCalledWith({
        data: { name: 'Editors', type: 'custom' },
      });
    });

    it('writes the role and its permissions in one transaction', async () => {
      const { role, roles, permission, transaction } = ctx;
      const rows = [{ action: 'a.b.c', subject: null, properties: {}, conditions: [] }];

      roles.findOne.mockResolvedValue(stored({ documentId: 'new-role' }));

      await role.create({ name: 'Editors', requireTwoFactor: true, permissions: rows });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permission.applyDiff).toHaveBeenCalledWith('new-role', {
        create: rows,
        update: [],
        delete: [],
      });
    });

    it('does not touch the permissions when there are none', async () => {
      const { role, roles, permission } = ctx;

      roles.findOne.mockResolvedValue(stored({ documentId: 'new-role' }));

      await role.create({ name: 'Editors' });

      expect(permission.applyDiff).not.toHaveBeenCalled();
    });

    it('takes a name or a description of 255 characters, and a name that is only that long once trimmed', async () => {
      const { role, roles, roleDocuments } = ctx;

      roles.findOne.mockResolvedValue(stored({ documentId: 'new-role' }));

      await role.create({ name: ` ${'n'.repeat(255)} `, description: 'd'.repeat(255) });

      expect(roleDocuments.create).toHaveBeenCalledWith({
        data: { name: 'n'.repeat(255), description: 'd'.repeat(255), type: 'custom' },
      });
    });

    it('refuses a name or a description of 256 characters with a validation error, before writing anything', async () => {
      const { role, roleDocuments, transaction } = ctx;

      for (const input of [
        { name: 'n'.repeat(256) },
        { name: 'A', description: 'd'.repeat(256) },
      ]) {
        // eslint-disable-next-line no-await-in-loop
        await expect(role.create(input), JSON.stringify(input).slice(0, 30)).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringContaining('255'),
        });
      }

      expect(transaction).not.toHaveBeenCalled();
      expect(roleDocuments.create).not.toHaveBeenCalled();
    });

    it('refuses the same action on the same subject twice before it creates the role', async () => {
      const { role, roleDocuments, permission, transaction } = ctx;
      const find = { action: 'api::note.note.find', subject: 'api::note.note' };

      await expect(
        role.create({ name: 'Twice', permissions: [find as never, { ...find } as never] })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringMatching(/api::note\.note\.find.*api::note\.note/),
      });

      expect(transaction).not.toHaveBeenCalled();
      expect(roleDocuments.create).not.toHaveBeenCalled();
      expect(permission.applyDiff).not.toHaveBeenCalled();
    });

    it("compares a row with no subject by its action's content type", async () => {
      const { role, roleDocuments, transaction } = ctx;

      await expect(
        role.create({
          name: 'Twice',
          permissions: [
            { action: 'api::note.note.find', subject: null } as never,
            { action: 'api::note.note.find', subject: 'api::note.note' } as never,
          ],
        })
      ).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringMatching(/api::note\.note\.find.*api::note\.note/),
      });

      expect(transaction).not.toHaveBeenCalled();
      expect(roleDocuments.create).not.toHaveBeenCalled();
    });

    it('refuses a row no route has, before writing anything', async () => {
      const { role, roleDocuments, permission, transaction } = ctx;
      const unknown = {
        action: 'api::nope.nope.find',
        subject: null,
        properties: {},
        conditions: [],
      };

      permission.checkRows.mockImplementationOnce(() => {
        throw new errors.ValidationError(
          'Permission 0 (api::nope.nope.find): no Content API route has this action'
        );
      });

      await expect(role.create({ name: 'Editors', permissions: [unknown] })).rejects.toThrow(
        /no Content API route/
      );

      // The rows as they are stored, checked as a list: the error's path is `['permissions', n, key]`
      expect(permission.checkRows).toHaveBeenCalledWith([unknown]);
      expect(transaction).not.toHaveBeenCalled();
      expect(roleDocuments.create).not.toHaveBeenCalled();
      expect(permission.applyDiff).not.toHaveBeenCalled();
    });

    it('refuses more permissions than a role may have, before it checks any of them', async () => {
      const { role, roleDocuments, permission } = ctx;
      const rows = Array.from({ length: 5_001 }, (_, n) => ({ action: `a.b.action${n}` }));

      await expect(role.create({ name: 'Too many', permissions: rows as never })).rejects.toThrow(
        /5,000/
      );

      expect(permission.checkRows).not.toHaveBeenCalled();
      expect(roleDocuments.create).not.toHaveBeenCalled();
    });

    it('refuses what is not a role before writing anything', async () => {
      const { role, roleDocuments, transaction } = ctx;

      for (const input of [
        {},
        { name: '' },
        { name: '   ' },
        { name: 42 },
        { name: 'A', description: 5 },
        { name: 'A', requireTwoFactor: 'yes' },
        { name: 'A', permissions: 'all' },
        { name: 'A', permissions: [{ action: '' }] },
      ]) {
        // eslint-disable-next-line no-await-in-loop
        await expect(role.create(input as never), JSON.stringify(input)).rejects.toMatchObject({
          name: 'ValidationError',
        });
      }

      expect(transaction).not.toHaveBeenCalled();
      expect(roleDocuments.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      ctx.roles.findOne.mockResolvedValue(stored());
    });

    /** A stored permission, as `permission.findForRoles` gives it */
    const storedPermission = (documentId: string, overrides: Row = {}) => ({
      documentId,
      action: 'api::note.note.find',
      subject: null,
      properties: { fields: ['title'] },
      conditions: [],
      roleDocumentId: 'role-a',
      roleName: 'Editors',
      ...overrides,
    });

    it('changes only what it is given', async () => {
      const { role, roleDocuments } = ctx;

      await role.update('role-a', { revision: 0, name: 'Renamed' });

      expect(roleDocuments.update).toHaveBeenCalledWith({
        documentId: 'role-a',
        data: { name: 'Renamed' },
      });
    });

    it('leaves the permissions alone when the input has none', async () => {
      const { role, permission } = ctx;

      await role.update('role-a', { revision: 0, name: 'Renamed', description: 'x' });

      expect(permission.applyDiff).not.toHaveBeenCalled();
      expect(permission.findForRoles).toHaveBeenCalledTimes(1); // the answer's own read
    });

    it('applies a diff of permissions in the same transaction as the rename', async () => {
      const { role, permission, transaction } = ctx;
      const diff = { create: [], update: [], delete: ['p1'] };

      await role.update('role-a', { revision: 0, name: 'Renamed', permissions: diff });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permission.applyDiff).toHaveBeenCalledWith('role-a', diff);
    });

    it('clears the permissions the ability service keeps once it has committed, and not when it rolls back', async () => {
      const { role, permission, invalidate, events, roleDocuments } = ctx;

      await role.update('role-a', { revision: 0, name: 'Renamed' });

      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(events).toEqual(['commit', 'invalidate']);

      events.length = 0;
      invalidate.mockClear();
      permission.applyDiff.mockRejectedValueOnce(new Error('disk full'));

      await expect(
        role.update('role-a', {
          revision: 0,
          name: 'Again',
          permissions: { create: [], update: [], delete: ['p1'] },
        })
      ).rejects.toThrow('disk full');

      expect(roleDocuments.update).toHaveBeenCalledTimes(2);
      expect(invalidate).not.toHaveBeenCalled();
      expect(events).toEqual(['rollback']);
    });

    it('refuses a name or a description longer than 255 characters, before writing anything', async () => {
      const { role, roleDocuments, transaction } = ctx;

      for (const input of [{ name: 'n'.repeat(256) }, { description: 'd'.repeat(256) }]) {
        // eslint-disable-next-line no-await-in-loop
        await expect(role.update('role-a', { revision: 0, ...input })).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringContaining('255'),
        });
      }

      expect(transaction).not.toHaveBeenCalled();
      expect(roleDocuments.update).not.toHaveBeenCalled();
    });

    it.each([
      [
        'two changes to one permission',
        {
          create: [],
          update: [
            { documentId: 'p1', properties: { fields: ['y'] } },
            { documentId: 'p1', properties: { fields: ['x'] } },
          ],
          delete: [],
        },
      ],
      [
        'a permission both changed and deleted',
        { create: [], update: [{ documentId: 'p1', subject: null }], delete: ['p1'] },
      ],
    ])('refuses %s with a 400 naming it, before any check or write', async (_, permissions) => {
      const { role, roles, roleDocuments, permission, transaction } = ctx;

      await expect(role.update('role-a', { revision: 0, permissions })).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringContaining('p1'),
      });

      expect(transaction).not.toHaveBeenCalled();
      expect(roles.updateMany).not.toHaveBeenCalled();
      expect(roleDocuments.update).not.toHaveBeenCalled();
      expect(permission.applyDiff).not.toHaveBeenCalled();
    });

    it('never changes the type of a role', async () => {
      const { role, roleDocuments } = ctx;

      await role.update('role-a', { revision: 0, name: 'X', type: 'public' } as never);

      expect(roleDocuments.update.mock.calls[0][0].data).toEqual({ name: 'X' });
    });

    it('writes no role data for an input that changes nothing but the revision', async () => {
      const { role, roles, roleDocuments } = ctx;

      await role.update('role-a', { revision: 0 });

      expect(roleDocuments.update).not.toHaveBeenCalled();
      // The save is still a save: the revision moves
      expect(roles.updateMany).toHaveBeenCalledTimes(1);
    });

    it('is a not found error for a role that is not there', async () => {
      const { role, roles, roleDocuments } = ctx;

      roles.findOne.mockResolvedValue(null);

      await expect(role.update('nope', { revision: 0, name: 'X' })).rejects.toMatchObject({
        name: 'NotFoundError',
      });
      expect(roleDocuments.update).not.toHaveBeenCalled();
    });

    it('refuses a blank name', async () => {
      await expect(ctx.role.update('role-a', { revision: 0, name: ' ' })).rejects.toMatchObject({
        name: 'ValidationError',
      });
    });

    describe('the revision', () => {
      it.each([
        [undefined],
        [null],
        ['4'],
        [-1],
        [1.5],
        [Number.NaN],
        [Number.MAX_SAFE_INTEGER + 1],
      ])('is a 400 when it is %j, and nothing is written', async (revision) => {
        const { role, roles, roleDocuments, transaction } = ctx;

        await expect(role.update('role-a', { revision, name: 'X' } as never)).rejects.toMatchObject(
          { name: 'ValidationError', message: expect.stringContaining('revision') }
        );

        expect(transaction).not.toHaveBeenCalled();
        expect(roles.updateMany).not.toHaveBeenCalled();
        expect(roleDocuments.update).not.toHaveBeenCalled();
      });

      it('moves the stored one from the revision the save was built on to the next', async () => {
        const { role, roles } = ctx;

        await role.update('role-a', { revision: 4, name: 'X' });

        expect(roles.updateMany).toHaveBeenCalledWith({
          where: { id: 1, revision: 4 },
          data: { revision: 5 },
        });
      });

      it('takes a role from before the column, whose revision is null, for revision 0', async () => {
        const { role, roles } = ctx;

        await role.update('role-a', { revision: 0, name: 'X' });

        expect(roles.updateMany).toHaveBeenCalledWith({
          where: { id: 1, $or: [{ revision: 0 }, { revision: { $null: true } }] },
          data: { revision: 1 },
        });
      });

      it('refuses a save on a stale revision and writes nothing', async () => {
        const { role, roles, roleDocuments, permission, invalidate, events } = ctx;

        roles.updateMany.mockResolvedValueOnce({ count: 0 });

        await expect(
          role.update('role-a', {
            revision: 3,
            name: 'Late',
            permissions: { create: [], update: [], delete: ['p1'] },
          })
        ).rejects.toMatchObject({
          name: 'RoleChangedError',
          details: { code: 'ROLE_CHANGED' },
        });

        expect(roleDocuments.update).not.toHaveBeenCalled();
        expect(permission.findForRoles).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(events).toEqual(['rollback']);
      });

      it('goes on to the checks and the writes when the revision is the stored one', async () => {
        const { role, roles, roleDocuments, permission } = ctx;

        roles.updateMany.mockResolvedValueOnce({ count: 1 });

        await role.update('role-a', {
          revision: 3,
          name: 'On time',
          permissions: { create: [], update: [], delete: ['p1'] },
        });

        expect(roleDocuments.update).toHaveBeenCalledTimes(1);
        expect(permission.applyDiff).toHaveBeenCalledTimes(1);
      });

      it('is the first thing a save writes, and is undone with it', async () => {
        const { role, roles, roleDocuments, events } = ctx;

        roleDocuments.update.mockRejectedValueOnce(new Error('That name is taken'));

        await expect(role.update('role-a', { revision: 0, name: 'Taken' })).rejects.toThrow(
          'That name is taken'
        );

        expect(roles.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
          roleDocuments.update.mock.invocationCallOrder[0]
        );
        expect(events).toEqual(['rollback']);
      });
    });

    describe('Public', () => {
      it('has no signed-in users, so two-factor is refused there', async () => {
        const { role, roles, roleDocuments } = ctx;

        roles.findOne.mockResolvedValue(stored({ type: 'public', name: 'Public' }));

        await expect(
          role.update('role-a', { revision: 0, requireTwoFactor: true })
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringMatching(/Public/),
        });

        expect(roles.updateMany).not.toHaveBeenCalled();
        expect(roleDocuments.update).not.toHaveBeenCalled();
      });

      it('may still be told two-factor is off, and other roles may require it', async () => {
        const { role, roles, roleDocuments } = ctx;

        roles.findOne.mockResolvedValue(stored({ type: 'public', name: 'Public' }));
        await role.update('role-a', { revision: 0, requireTwoFactor: false });

        roles.findOne.mockResolvedValue(stored());
        await role.update('role-a', { revision: 0, requireTwoFactor: true });

        expect(roleDocuments.update).toHaveBeenCalledTimes(2);
      });
    });

    describe('the checks of a diff', () => {
      it('refuses a created row no route has, before writing', async () => {
        const { role, roleDocuments, permission } = ctx;
        const unknown = {
          action: 'api::nope.nope.find',
          subject: null,
          properties: {},
          conditions: [],
        };

        permission.findProblems.mockReturnValueOnce([
          {
            index: 0,
            action: unknown.action,
            key: 'action',
            reason: 'no Content API route or synthetic action has this action',
          },
        ]);

        await expect(
          role.update('role-a', {
            revision: 0,
            name: 'Renamed',
            permissions: { create: [unknown], update: [], delete: [] },
          })
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringMatching(
            /^Permission 0 \(api::nope\.nope\.find\): .*no Content API route/
          ),
          details: {
            errors: [expect.objectContaining({ path: ['permissions', 'create', 0, 'action'] })],
          },
        });

        expect(permission.findProblems).toHaveBeenCalledWith([unknown]);
        expect(roleDocuments.update).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();
      });

      it('checks an updated row merged over the stored row read in the transaction', async () => {
        const { role, permission } = ctx;

        permission.findForRoles.mockResolvedValueOnce([
          storedPermission('p1', { action: 'api::note.note.find' }),
          storedPermission('p2', {
            action: 'api::note.note.update',
            subject: 'api::note.note',
            conditions: [{ name: 'plugin::end-users.is-owner' }],
          }),
        ]);
        permission.findProblems.mockImplementationOnce((rows) =>
          rows.flatMap((row, index) =>
            row.properties.fields?.includes('nope')
              ? [{ index, action: row.action, key: 'properties', reason: 'no such field' }]
              : []
          )
        );

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: {
              create: [],
              // Only the properties change: the action, subject and conditions are the stored ones
              update: [{ documentId: 'p2', properties: { fields: ['nope'] } }],
              delete: [],
            },
          })
        ).rejects.toMatchObject({
          message: 'Permission 0 (api::note.note.update): no such field',
          details: {
            errors: [expect.objectContaining({ path: ['permissions', 'update', 0, 'properties'] })],
          },
        });

        expect(permission.findProblems).toHaveBeenCalledWith([
          {
            action: 'api::note.note.update',
            subject: 'api::note.note',
            properties: { fields: ['nope'] },
            conditions: [{ name: 'plugin::end-users.is-owner' }],
          },
        ]);
        expect(permission.findForRoles.mock.calls[0]).toEqual([['role-a']]);
        expect(permission.applyDiff).not.toHaveBeenCalled();
      });

      it('lets a change replace the stored subject, even with null, and the stored conditions', async () => {
        const { role, permission } = ctx;

        permission.findForRoles.mockResolvedValueOnce([
          storedPermission('p1', {
            action: 'api::note.note.find',
            subject: 'api::note.note',
            conditions: [{ name: 'plugin::end-users.is-owner' }],
          }),
        ]);

        await role.update('role-a', {
          revision: 0,
          permissions: {
            create: [],
            update: [{ documentId: 'p1', subject: null, conditions: [] }],
            delete: [],
          },
        });

        expect(permission.findProblems).toHaveBeenCalledWith([
          {
            action: 'api::note.note.find',
            subject: null,
            properties: { fields: ['title'] },
            conditions: [],
          },
        ]);
      });

      it('names a row by its place in its own list, whether it is created or updated', async () => {
        const { role, permission } = ctx;
        const created = (action: string) => ({
          action,
          subject: null,
          properties: {},
          conditions: [],
        });

        permission.findForRoles.mockResolvedValueOnce([
          storedPermission('p1'),
          storedPermission('p2', { action: 'api::note.note.findOne' }),
        ]);
        // Two created rows, then two updated: the problem is the second updated one
        permission.findProblems.mockReturnValueOnce([
          { index: 3, action: 'api::note.note.findOne', key: 'conditions', reason: 'gone' },
        ]);

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: {
              create: [created('x.y.a'), created('x.y.b')],
              update: [
                { documentId: 'p1', properties: {} },
                { documentId: 'p2', conditions: [{ name: 'gone' }] },
              ],
              delete: [],
            },
          })
        ).rejects.toMatchObject({
          message: 'Permission 1 (api::note.note.findOne): gone',
          details: {
            errors: [expect.objectContaining({ path: ['permissions', 'update', 1, 'conditions'] })],
          },
        });
      });

      it('never checks a delete, and reads no stored row for a diff that only deletes', async () => {
        const { role, permission } = ctx;

        await role.update('role-a', {
          revision: 0,
          permissions: { create: [], update: [], delete: ['p1', 'p2'] },
        });

        expect(permission.applyDiff).toHaveBeenCalledTimes(1);
        // Once each, for the role the answer is built from
        expect(permission.findProblems).toHaveBeenCalledTimes(1);
        expect(permission.findForRoles).toHaveBeenCalledTimes(1);
      });

      it('refuses a change to a row that is not on the role with a 404, as applyDiff does, and writes nothing', async () => {
        const { role, permission, roleDocuments, events } = ctx;

        permission.findForRoles.mockResolvedValue([storedPermission('p1')]);

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: {
              create: [],
              update: [{ documentId: 'elsewhere', properties: {} }],
              delete: [],
            },
          })
        ).rejects.toMatchObject({
          name: 'NotFoundError',
          message: 'Permission elsewhere not found on this role',
        });

        // Never skipped to be written unchecked: nothing was checked as a row, written or kept
        expect(permission.findProblems).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();
        expect(roleDocuments.update).not.toHaveBeenCalled();
        expect(events).toEqual(['rollback']);
      });

      it('refuses the missing one even when another change in the diff is fine', async () => {
        const { role, permission } = ctx;

        permission.findForRoles.mockResolvedValue([storedPermission('p1'), storedPermission('p2')]);

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: {
              create: [],
              update: [
                { documentId: 'p1', properties: {} },
                { documentId: 'p3', properties: {} },
              ],
              delete: [],
            },
          })
        ).rejects.toMatchObject({ name: 'NotFoundError', message: expect.stringContaining('p3') });

        expect(permission.applyDiff).not.toHaveBeenCalled();
      });

      it('refuses an upper-case variant of a stored id with a 400, before a transaction opens', async () => {
        const { role, transaction, permission } = ctx;

        permission.findForRoles.mockResolvedValue([storedPermission('abc123')]);

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: {
              create: [],
              update: [{ documentId: 'ABC123', properties: {} }],
              delete: [],
            },
          })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: { create: [], update: [], delete: ['ABC123'] },
          })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        expect(transaction).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();
      });

      it('refuses a diff that would leave the role with more than 5,000 permissions, counting its deletes', async () => {
        const { role, permission } = ctx;
        const created = (n: number) => ({
          action: `x.y.action${n}`,
          subject: null,
          properties: {},
          conditions: [],
        });
        const heldRows = Array.from({ length: 4_998 }, (_, n) => storedPermission(`p${n}`));

        permission.findForRoles.mockResolvedValue(heldRows);

        // 4,998 kept + 3 created = 5,001
        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: { create: [created(1), created(2), created(3)], update: [], delete: [] },
          })
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringContaining('5,000'),
        });

        expect(permission.findProblems).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();

        // One deleted makes room for it, and a delete of a row that is not there does not
        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: {
              create: [created(1), created(2), created(3)],
              update: [],
              delete: ['p0', 'notonthisrole'],
            },
          })
        ).resolves.toBeDefined();
        expect(permission.applyDiff).toHaveBeenCalledTimes(1);
      });

      it('refuses a part of a diff longer than a role may be, before it opens a transaction', async () => {
        const { role, transaction, permission } = ctx;
        const longList = Array.from({ length: 5_001 }, (_, n) => ({ action: `x.y.a${n}` }));

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: { create: longList, update: [], delete: [] } as never,
          })
        ).rejects.toThrow(/5,000/);

        expect(transaction).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();
      });

      it('refuses a malformed row before it opens a transaction', async () => {
        const { role, transaction } = ctx;

        await expect(
          role.update('role-a', {
            revision: 0,
            permissions: { create: [{ action: '' }], update: [], delete: [] } as never,
          })
        ).rejects.toMatchObject({ name: 'ValidationError' });

        expect(transaction).not.toHaveBeenCalled();
      });
    });
  });

  describe('delete', () => {
    /**
     * The roles a delete looks up, and who holds what: `held` maps a user's id to the ids of the roles
     * they hold, and the fake of the user table answers the queries of a delete from it, and applies
     * the connects and disconnects of an update. Role 1 is the one deleted.
     */
    const world = (held: Record<number, number[]>, { withDefault = true } = {}) => {
      const { roles, users } = ctx;
      const known: Record<string, Row> = {
        'role-a': stored({ id: 1, documentId: 'role-a', name: 'Premium' }),
        'role-editor': stored({ id: 2, documentId: 'role-editor', name: 'Editor' }),
        'role-auth': stored({
          id: 3,
          documentId: 'role-auth',
          name: 'Authenticated',
          type: 'authenticated',
        }),
      };

      roles.findOne.mockImplementation(
        async ({ where }: { where: { documentId?: string; type?: string } }) => {
          if (where.type === 'authenticated') {
            return withDefault ? known['role-auth'] : null;
          }

          return known[where.documentId as string] ?? null;
        }
      );

      const holdersOf = (roleId: number) =>
        Object.keys(held)
          .map(Number)
          .filter((id) => held[id].includes(roleId))
          .sort((a, b) => a - b);

      users.count.mockImplementation(
        async ({ where }: { where: { roles: { documentId: string } } }) =>
          holdersOf(known[where.roles.documentId].id as number).length
      );
      users.findMany.mockImplementation(
        async ({ where, limit }: { where: { roles: { id: number } }; limit: number }) =>
          holdersOf(where.roles.id)
            .slice(0, limit)
            .map((id) => ({ id, roles: held[id].map((roleId) => ({ id: roleId })) }))
      );
      users.update.mockImplementation(
        async ({
          where,
          data,
        }: {
          where: { id: number };
          data: { roles: { connect?: Array<{ id: number }>; disconnect?: Array<{ id: number }> } };
        }) => {
          const { connect = [], disconnect = [] } = data.roles;

          // eslint-disable-next-line no-param-reassign
          held[where.id] = [
            ...held[where.id].filter((id) => !disconnect.some((gone) => gone.id === id)),
            ...connect.map((added) => added.id),
          ];

          return {};
        }
      );

      return held;
    };

    it.each(['public', 'authenticated'])('refuses to delete the %s role', async (type) => {
      const { role, roles, roleDocuments, permissions } = ctx;

      roles.findOne.mockResolvedValue(stored({ type }));

      await expect(role.delete('role-a')).rejects.toMatchObject({ name: 'ValidationError' });
      expect(permissions.deleteMany).not.toHaveBeenCalled();
      expect(roleDocuments.delete).not.toHaveBeenCalled();
    });

    it('deletes a role nobody holds, with its permissions, in one transaction, and says nobody moved', async () => {
      const { role, roles, roleDocuments, permissions, transaction } = ctx;

      roles.findOne.mockResolvedValue(stored({ id: 9, name: 'Premium' }));

      await expect(role.delete('role-a')).resolves.toEqual({
        documentId: 'role-a',
        name: 'Premium',
        movedToDefault: 0,
      });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(permissions.deleteMany).toHaveBeenCalledWith({ where: { role: { id: 9 } } });
      expect(roleDocuments.delete).toHaveBeenCalledWith({ documentId: 'role-a' });
      expect(permissions.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
        roleDocuments.delete.mock.invocationCallOrder[0]
      );
      // Nobody needs the default role, so it is not even looked for
      expect(roles.findOne).toHaveBeenCalledTimes(1);
    });

    it('deletes a role with users: other roles are kept, and the users left with none get the default role', async () => {
      const { role, roleDocuments, users } = ctx;
      // A holds Premium (1) and Editor (2), B Premium only
      const held = world({ 10: [1, 2], 11: [1] });

      await expect(role.delete('role-a')).resolves.toEqual({
        documentId: 'role-a',
        name: 'Premium',
        movedToDefault: 1,
      });

      expect(held).toEqual({ 10: [2], 11: [3] });
      expect(users.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { roles: { disconnect: [{ id: 1 }] } },
      });
      expect(users.update).toHaveBeenCalledWith({
        where: { id: 11 },
        data: { roles: { connect: [{ id: 3 }], disconnect: [{ id: 1 }] } },
      });
      expect(roleDocuments.delete).toHaveBeenCalledWith({ documentId: 'role-a' });
    });

    it('gives nobody the default role who has it already or has another role', async () => {
      const { role, users } = ctx;
      // Authenticated (3) and Editor (2) are other roles: both just lose Premium
      const held = world({ 10: [1, 3], 11: [2, 1] });

      await expect(role.delete('role-a')).resolves.toMatchObject({ movedToDefault: 0 });

      expect(held).toEqual({ 10: [3], 11: [2] });
      expect(users.update).toHaveBeenCalledTimes(2);
    });

    it('reads the first page of holders again until none is left, never with an id cursor', async () => {
      const { role, users } = ctx;
      const held = world(Object.fromEntries(Array.from({ length: 1_200 }, (_, n) => [n + 1, [1]])));

      await expect(role.delete('role-a')).resolves.toMatchObject({ movedToDefault: 1_200 });

      // 500, 500, 200, and the empty page that ends it, each the first page of what is left
      expect(users.findMany).toHaveBeenCalledTimes(4);
      for (const [query] of users.findMany.mock.calls) {
        expect(query.where).toEqual({ roles: { id: 1 } });
        expect(query.limit).toBe(500);
      }
      expect(Object.values(held).every((roles) => roles.length === 1 && roles[0] === 3)).toBe(true);
    });

    it('refuses a role held by more than 5,000 users, and moves nobody', async () => {
      const { role, users, roleDocuments, permissions } = ctx;

      world({});
      users.count.mockResolvedValueOnce(5_001);

      await expect(role.delete('role-a')).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringMatching(
          /5,001 users have the Premium role: move its users to other roles first/
        ),
      });

      expect(users.findMany).not.toHaveBeenCalled();
      expect(users.update).not.toHaveBeenCalled();
      expect(permissions.deleteMany).not.toHaveBeenCalled();
      expect(roleDocuments.delete).not.toHaveBeenCalled();
    });

    it('takes a role held by exactly 5,000 users', async () => {
      const { role, users, roleDocuments } = ctx;

      world({});
      users.count.mockResolvedValueOnce(5_000);

      await role.delete('role-a');

      expect(roleDocuments.delete).toHaveBeenCalledTimes(1);
    });

    it('gives up on a role that keeps getting holders as it is emptied', async () => {
      const { role, users, roleDocuments, events } = ctx;

      world({});
      users.count.mockResolvedValueOnce(5_000);
      // Every page is full of users who still hold the role, as if the writes took no effect
      users.findMany.mockImplementation(async () =>
        Array.from({ length: 500 }, (_, n) => ({ id: n + 1, roles: [{ id: 1 }, { id: 2 }] }))
      );
      users.update.mockImplementation(async () => ({}));

      await expect(role.delete('role-a')).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringContaining('move its users to other roles first'),
      });

      expect(users.update).toHaveBeenCalledTimes(5_000);
      expect(roleDocuments.delete).not.toHaveBeenCalled();
      expect(events).toEqual(['rollback']);
    });

    it('rolls the delete back when a holder appears during it', async () => {
      const { role, users, permissions, roleDocuments, invalidate, events } = ctx;

      world({});
      // Nobody holds it when the delete starts, and somebody does by the last count
      users.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

      await expect(role.delete('role-a')).rejects.toMatchObject({
        name: 'ValidationError',
        message: expect.stringContaining('while it was being deleted'),
      });

      expect(permissions.deleteMany).not.toHaveBeenCalled();
      expect(roleDocuments.delete).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(events).toEqual(['rollback']);
    });

    it('says so when the default role is not there for a user who needs it, and deletes nothing', async () => {
      const { role, roleDocuments, events } = ctx;

      world({ 10: [1] }, { withDefault: false });

      await expect(role.delete('role-a')).rejects.toThrow(/default role/i);

      expect(roleDocuments.delete).not.toHaveBeenCalled();
      expect(events).toEqual(['rollback']);
    });

    describe('the permissions the ability service keeps', () => {
      it('are cleared once a delete has committed, and once', async () => {
        const { role, roles, invalidate, events } = ctx;

        roles.findOne.mockResolvedValue(stored({ id: 9 }));

        await role.delete('role-a');

        expect(invalidate).toHaveBeenCalledTimes(1);
        // Not while the permissions and the role are deleted but not committed
        expect(events).toEqual(['commit', 'invalidate']);
      });

      it('are cleared once a delete that releases its users has committed, and once', async () => {
        const { role, invalidate, events } = ctx;

        world({ 10: [1, 2], 11: [1] });

        await role.delete('role-a');

        expect(invalidate).toHaveBeenCalledTimes(1);
        expect(events).toEqual(['commit', 'invalidate']);
      });

      it('are not cleared when releasing the users fails, which undoes the delete', async () => {
        const { role, users, roleDocuments, invalidate, events } = ctx;

        world({ 10: [1] });
        users.update.mockRejectedValueOnce(new Error('connection lost'));

        await expect(role.delete('role-a')).rejects.toThrow('connection lost');

        expect(roleDocuments.delete).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
        expect(events).toEqual(['rollback']);
      });

      it('are not cleared when deleting the role fails after its permissions went', async () => {
        const { role, roles, permissions, roleDocuments, invalidate, events } = ctx;

        roles.findOne.mockResolvedValue(stored({ id: 9 }));
        roleDocuments.delete.mockRejectedValueOnce(new Error('disk full'));

        await expect(role.delete('role-a')).rejects.toThrow('disk full');

        expect(permissions.deleteMany).toHaveBeenCalledTimes(1);
        expect(invalidate).not.toHaveBeenCalled();
        expect(events).toEqual(['rollback']);
      });

      it('are not cleared when the delete is refused', async () => {
        const { role, roles, invalidate } = ctx;

        roles.findOne.mockResolvedValue(stored({ type: 'public' }));

        await expect(role.delete('role-a')).rejects.toMatchObject({ name: 'ValidationError' });

        expect(invalidate).not.toHaveBeenCalled();
      });
    });

    it('is a not found error for a role that is not there', async () => {
      await expect(ctx.role.delete('nope')).rejects.toMatchObject({ name: 'NotFoundError' });
    });
  });

  describe('getForUser', () => {
    it('answers the roles of the user, in short', async () => {
      const { role, users } = ctx;

      users.findOne.mockResolvedValueOnce({
        id: 1,
        roles: [
          {
            id: 3,
            documentId: 'a',
            name: 'Authenticated',
            description: 'Default role',
            type: 'authenticated',
            requireTwoFactor: false,
          },
          { id: 4, documentId: 'b', name: 'Staff', type: 'custom', requireTwoFactor: true },
        ],
      });

      expect(await role.getForUser('user-1')).toEqual([
        {
          id: 3,
          documentId: 'a',
          name: 'Authenticated',
          description: 'Default role',
          type: 'authenticated',
          requireTwoFactor: false,
        },
        {
          id: 4,
          documentId: 'b',
          name: 'Staff',
          description: null,
          type: 'custom',
          requireTwoFactor: true,
        },
      ]);
      expect(users.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId: 'user-1' } })
      );
    });

    it('answers none for a user that is not there', async () => {
      expect(await ctx.role.getForUser('ghost')).toEqual([]);
    });
  });

  describe('files', () => {
    const rows = [
      { documentId: 'p2', action: 'b.b.b', subject: 'x', properties: {}, conditions: [] },
      { documentId: 'p1', action: 'a.a.a', subject: null, properties: {}, conditions: [] },
    ].map((row) => ({ ...row, roleDocumentId: 'role-a', roleName: 'Editors' }));

    describe('toFile', () => {
      it('writes the role and its permissions by action and subject, with no ids', async () => {
        const { role, roles, permission } = ctx;

        roles.findOne.mockResolvedValueOnce(
          stored({ description: 'Writes', requireTwoFactor: true })
        );
        permission.findForRoles.mockResolvedValueOnce(rows);

        const file = await role.toFile('role-a');

        expect(file).toEqual({
          version: 1,
          role: { name: 'Editors', description: 'Writes', type: 'custom', requireTwoFactor: true },
          permissions: [
            { action: 'a.a.a', subject: null, properties: {}, conditions: [] },
            { action: 'b.b.b', subject: 'x', properties: {}, conditions: [] },
          ],
        });
        expect(JSON.stringify(file)).not.toMatch(/documentId|role-a|"id"/);
      });
    });

    describe('fromFile', () => {
      const file = (overrides: Row = {}) => ({
        version: 1,
        role: { name: 'Imported', description: 'd', type: 'custom', requireTwoFactor: true },
        permissions: [{ action: 'a.a.a', subject: null, properties: {}, conditions: [] }],
        ...overrides,
      });

      beforeEach(() => {
        ctx.roles.findOne.mockResolvedValue(stored({ documentId: 'new-role', name: 'Imported' }));
      });

      it('makes a custom role from the file', async () => {
        const { role, roleDocuments, permission } = ctx;

        await role.fromFile(file());

        expect(roleDocuments.create).toHaveBeenCalledWith({
          data: { name: 'Imported', description: 'd', requireTwoFactor: true, type: 'custom' },
        });
        expect(permission.applyDiff).toHaveBeenCalledWith('new-role', {
          create: file().permissions,
          update: [],
          delete: [],
        });
      });

      it('checks the rows it read (checkRows) before it creates anything', async () => {
        const { role, roleDocuments, transaction, permission } = ctx;
        const events: string[] = [];

        permission.checkRows.mockImplementationOnce(() => {
          events.push('checkRows');
        });
        transaction.mockImplementationOnce(async (work) => {
          events.push('transaction');

          return work({ onCommit() {} });
        });

        await role.fromFile(
          file({
            permissions: [JSON.parse('{ "action": "a.a.a", "extra": 1 }')],
          })
        );

        // The rows as they are stored: what the file left out filled in, what it added gone
        expect(permission.checkRows).toHaveBeenCalledWith([
          { action: 'a.a.a', subject: null, properties: {}, conditions: [] },
        ]);
        expect(events).toEqual(['checkRows', 'transaction']);
        expect(roleDocuments.create).toHaveBeenCalledTimes(1);
      });

      it('creates nothing when checkRows refuses a row', async () => {
        const { role, roleDocuments, transaction, permission } = ctx;

        permission.checkRows.mockImplementationOnce(() => {
          throw new errors.ValidationError('Permission 0 (a.a.a): no route has it');
        });

        await expect(role.fromFile(file())).rejects.toMatchObject({
          name: 'ValidationError',
          message: 'Permission 0 (a.a.a): no route has it',
        });

        expect(transaction).not.toHaveBeenCalled();
        expect(roleDocuments.create).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();
      });

      it('never makes a second Public or Authenticated, whatever type the file says', async () => {
        const { role, roleDocuments } = ctx;

        await role.fromFile(file({ role: { name: 'Imported', type: 'authenticated' } }));

        expect(roleDocuments.create.mock.calls[0][0].data.type).toBe('custom');
      });

      it('refuses a file that has the same action on the same subject twice, before writing anything', async () => {
        const { role, roleDocuments, transaction, permission } = ctx;
        const twice = { action: 'a.a.a', subject: 'x', properties: {}, conditions: [] };

        await expect(
          role.fromFile(
            file({ permissions: [twice, { ...twice, properties: { fields: ['id'] } }] })
          )
        ).rejects.toMatchObject({
          name: 'ValidationError',
          message: expect.stringMatching(/a\.a\.a.*"x"/),
        });

        expect(transaction).not.toHaveBeenCalled();
        expect(roleDocuments.create).not.toHaveBeenCalled();
        expect(permission.applyDiff).not.toHaveBeenCalled();
      });

      it('stores only the keys of a permission it knows, whatever the file carries', async () => {
        const { role, permission } = ctx;

        await role.fromFile(
          file({
            permissions: [
              JSON.parse(`{
                "action": "a.a.a",
                "isAdmin": true,
                "properties": { "fields": ["title"], "extra": 1, "__proto__": { "polluted": true } },
                "conditions": [{ "name": "is-owner", "extra": 1 }]
              }`),
            ],
          })
        );

        const [, diff] = permission.applyDiff.mock.calls[0] as unknown as [
          string,
          { create: Array<Record<string, unknown>> },
        ];

        expect(diff.create).toEqual([
          {
            action: 'a.a.a',
            subject: null,
            properties: { fields: ['title'] },
            conditions: [{ name: 'is-owner' }],
          },
        ]);
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      });

      it('refuses what is not a role file, before writing anything', async () => {
        const { role, roleDocuments, transaction } = ctx;

        for (const bad of [
          null,
          'role',
          [],
          {},
          file({ version: 2 }),
          file({ version: undefined }),
          file({ role: undefined }),
          file({ role: 'Imported' }),
          file({ role: { description: 'no name' } }),
          file({ permissions: undefined }),
          file({ permissions: {} }),
          file({ permissions: [{ action: 42 }] }),
        ]) {
          // eslint-disable-next-line no-await-in-loop
          await expect(role.fromFile(bad), JSON.stringify(bad)).rejects.toMatchObject({
            name: 'ValidationError',
          });
        }

        expect(transaction).not.toHaveBeenCalled();
        expect(roleDocuments.create).not.toHaveBeenCalled();
      });
    });
  });

  it('asks the plugin for the permission service, not for its own copy', async () => {
    const { role, roles, plugin } = ctx;

    roles.findOne.mockResolvedValueOnce(stored());
    await role.get('role-a');

    expect(plugin).toHaveBeenCalledWith(PLUGIN_ID);
  });
});
