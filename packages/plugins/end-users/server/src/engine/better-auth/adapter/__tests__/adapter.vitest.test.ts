import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BetterAuthOptions } from 'better-auth';

import { strapiAdapter } from '../adapter';
import { transformFilters } from '../transformers/filters';
import { createTransaction } from '../../../../__tests__/utils/fake-strapi';

/**
 * Better Auth only knows `user`, `session`, `account` and `verification` out of the box. The other
 * models the plugin stores (two-factor, rate limit, passkey, jwks) are declared here the way the
 * Better Auth plugins declare them, so the adapter can be exercised against every model.
 */
const options: BetterAuthOptions = {
  rateLimit: { storage: 'database' },
  plugins: [
    {
      id: 'fixture',
      schema: {
        twoFactor: {
          fields: {
            secret: { type: 'string' },
            backupCodes: { type: 'string', required: false },
            failedVerificationCount: { type: 'number', required: false },
            lockedUntil: { type: 'date', required: false },
          },
        },
        passkey: { fields: { name: { type: 'string' } } },
        jwks: { fields: { publicKey: { type: 'string' } } },
        lockoutCounter: { fields: { key: { type: 'string' } } },
      },
    },
  ],
};

// Every name is an attribute of its own (`Object.hasOwn` sees it), not one inherited from a prototype.
const anyAttribute = new Proxy(
  {},
  {
    get: () => ({ type: 'string' }),
    has: () => true,
    getOwnPropertyDescriptor: () => ({
      value: { type: 'string' },
      enumerable: true,
      configurable: true,
      writable: true,
    }),
  }
);

describe('strapiAdapter', () => {
  let documents: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  let db: {
    findOne: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  let queryBuilder: {
    select: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    first: ReturnType<typeof vi.fn>;
    forUpdate: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  };
  let strapiMock: {
    documents: ReturnType<typeof vi.fn>;
    getModel: ReturnType<typeof vi.fn>;
    config: { get: ReturnType<typeof vi.fn> };
    db: {
      transaction: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
      queryBuilder: ReturnType<typeof vi.fn>;
    };
  };
  let adapter: ReturnType<ReturnType<typeof strapiAdapter>>;

  beforeEach(() => {
    documents = {
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    };
    db = {
      findOne: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    queryBuilder = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockReturnThis(),
      forUpdate: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(null),
    };
    strapiMock = {
      documents: vi.fn(() => documents),
      // Every field is an attribute unless a test says otherwise.
      getModel: vi.fn(() => ({ attributes: anyAttribute })),
      config: { get: vi.fn(() => false) },
      db: {
        transaction: createTransaction().transaction,
        query: vi.fn(() => db),
        queryBuilder: vi.fn(() => queryBuilder),
      },
    };
    vi.stubGlobal('strapi', strapiMock);

    adapter = strapiAdapter()(options);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('create', () => {
    it('returns the documentId Strapi created as the Better Auth id', async () => {
      documents.create.mockResolvedValue({ id: 7, documentId: 'abc123', email: 'a@x.io' });

      const row = await adapter.create<{ email: string }, { id: string; email: string }>({
        model: 'user',
        data: { email: 'a@x.io' },
      });

      expect(row.id).toBe('abc123');
      expect(row.email).toBe('a@x.io');
      expect(documents.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.not.objectContaining({ id: expect.anything() }) })
      );
      expect(documents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ documentId: expect.anything() }),
        })
      );
    });

    it('turns datetime strings from Strapi into Date objects, and only those', async () => {
      documents.create.mockResolvedValue({
        id: 1,
        documentId: 'abc123',
        // A name that merely looks like a datetime must stay a string.
        name: '2020-01-01T00:00:00.000Z',
        createdAt: '2026-10-28T10:00:00.000Z',
        updatedAt: '2026-10-28T10:00:01.000Z',
      });

      const row = await adapter.create<Record<string, unknown>, Record<string, unknown>>({
        model: 'user',
        data: { name: 'x' },
      });

      expect(row.createdAt).toEqual(new Date('2026-10-28T10:00:00.000Z'));
      expect(row.updatedAt).toBeInstanceOf(Date);
      expect(row.name).toBe('2020-01-01T00:00:00.000Z');
    });

    it('hands a forced id to Strapi as the documentId', async () => {
      documents.create.mockResolvedValue({ id: 2, documentId: 'forced-id' });

      await adapter.create({
        model: 'verification',
        data: { id: 'forced-id', identifier: 'a', value: 'b', expiresAt: new Date() },
        forceAllowId: true,
      });

      expect(documents.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ documentId: 'forced-id' }) })
      );
    });

    it.each([
      ['user', 'plugin::end-users.user'],
      ['session', 'plugin::end-users.session'],
      ['account', 'plugin::end-users.account'],
      ['verification', 'plugin::end-users.verification'],
      ['twoFactor', 'plugin::end-users.two-factor'],
      ['passkey', 'plugin::end-users.passkey'],
      ['jwks', 'plugin::end-users.jwk'],
      ['rateLimit', 'plugin::end-users.rate-limit'],
      ['lockoutCounter', 'plugin::end-users.lockout-counter'],
    ])('stores the %s model in %s', async (model, uid) => {
      documents.count.mockResolvedValue(0);

      await adapter.count({ model });

      expect(strapiMock.documents).toHaveBeenCalledWith(uid);
    });
  });

  describe('find', () => {
    it('turns where id into a documentId filter', async () => {
      await adapter.findOne({ model: 'user', where: [{ field: 'id', value: 'abc123' }] });

      expect(documents.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { documentId: { $eq: 'abc123' } } })
      );
    });

    it('returns null when nothing matches and the row with its id when something does', async () => {
      expect(
        await adapter.findOne({ model: 'user', where: [{ field: 'email', value: 'a@x.io' }] })
      ).toBeNull();

      documents.findFirst.mockResolvedValue({ id: 3, documentId: 'abc123', email: 'a@x.io' });

      expect(
        await adapter.findOne({ model: 'user', where: [{ field: 'email', value: 'a@x.io' }] })
      ).toMatchObject({ id: 'abc123', email: 'a@x.io' });
    });

    it('selects the documentId when the id is selected', async () => {
      await adapter.findOne({
        model: 'user',
        where: [{ field: 'email', value: 'a@x.io' }],
        select: ['id', 'email'],
      });

      expect(documents.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ fields: ['documentId', 'email'] })
      );
    });

    it('passes userId references through as strings', async () => {
      await adapter.findMany({ model: 'session', where: [{ field: 'userId', value: 'abc123' }] });

      expect(documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { userId: { $eq: 'abc123' } } })
      );
    });

    it('maps limit, offset and sort, and returns every row with its id', async () => {
      documents.findMany.mockResolvedValue([
        { id: 1, documentId: 'a', userId: 'u1', createdAt: '2026-10-28T10:00:00.000Z' },
        { id: 2, documentId: 'b', userId: 'u1', createdAt: '2026-10-28T11:00:00.000Z' },
      ]);

      const rows = await adapter.findMany<{ id: string; createdAt: Date }>({
        model: 'session',
        where: [{ field: 'userId', value: 'u1' }],
        limit: 10,
        offset: 5,
        sortBy: { field: 'createdAt', direction: 'desc' },
      });

      expect(documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, start: 5, sort: 'createdAt:desc' })
      );
      expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
      expect(rows[0].createdAt).toBeInstanceOf(Date);
    });

    it('sorts by id as the documentId', async () => {
      await adapter.findMany({
        model: 'session',
        where: [{ field: 'userId', value: 'u1' }],
        sortBy: { field: 'id', direction: 'asc' },
      });

      expect(documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ sort: 'documentId:asc' })
      );
    });

    it('refuses joins, which the Document Service cannot do', async () => {
      await expect(
        adapter.findOne({
          model: 'session',
          where: [{ field: 'id', value: 'abc123' }],
          join: { user: true },
        })
      ).resolves.toBeNull();

      const joinsEnabled = strapiAdapter()({ ...options, advanced: { database: { joins: true } } });

      await expect(
        joinsEnabled.findOne({
          model: 'session',
          where: [{ field: 'id', value: 'abc123' }],
          join: { user: true },
        })
      ).rejects.toThrow(/join/i);
    });
  });

  describe('count', () => {
    it('counts with the Document Service count, not by loading rows', async () => {
      documents.count.mockResolvedValue(3);

      expect(await adapter.count({ model: 'session' })).toBe(3);
      expect(documents.findMany).not.toHaveBeenCalled();
    });

    it('applies the where clause to the count', async () => {
      documents.count.mockResolvedValue(2);

      await adapter.count({ model: 'session', where: [{ field: 'userId', value: 'abc123' }] });

      expect(documents.count).toHaveBeenCalledWith({ filters: { userId: { $eq: 'abc123' } } });
    });
  });

  /**
   * `user` writes go through the Document Service so its middlewares run. Every other model is an
   * engine table and is written through `strapi.db.query`, one guarded statement at a time.
   */
  describe('update', () => {
    it('updates a user through the Document Service, by documentId', async () => {
      documents.findFirst.mockResolvedValue({ id: 3, documentId: 'abc123' });
      documents.update.mockResolvedValue({ id: 3, documentId: 'abc123', name: 'New name' });

      const row = await adapter.update<{ id: string; name: string }>({
        model: 'user',
        where: [{ field: 'id', value: 'abc123' }],
        update: { name: 'New name' },
      });

      expect(documents.update).toHaveBeenCalledWith({
        documentId: 'abc123',
        data: expect.objectContaining({ name: 'New name' }),
      });
      expect(row).toMatchObject({ id: 'abc123', name: 'New name' });
      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it('returns null when no user matches', async () => {
      const row = await adapter.update({
        model: 'user',
        where: [{ field: 'id', value: 'missing' }],
        update: { name: 'New name' },
      });

      expect(row).toBeNull();
      expect(documents.update).not.toHaveBeenCalled();
    });

    it('writes an engine table with the where in the statement, not just the id', async () => {
      db.findOne
        .mockResolvedValueOnce({ id: 5, documentId: 's1' })
        .mockResolvedValueOnce({ id: 5, documentId: 's1', ipAddress: '1.2.3.4' });
      db.updateMany.mockResolvedValue({ count: 1 });

      const row = await adapter.update<{ id: string; ipAddress: string }>({
        model: 'session',
        where: [{ field: 'id', value: 's1' }],
        update: { ipAddress: '1.2.3.4' },
      });

      expect(db.updateMany).toHaveBeenCalledWith({
        where: { $and: [{ id: 5 }, { documentId: { $eq: 's1' } }] },
        data: expect.objectContaining({ ipAddress: '1.2.3.4' }),
      });
      expect(documents.update).not.toHaveBeenCalled();
      expect(row).toMatchObject({ id: 's1', ipAddress: '1.2.3.4' });
    });

    it('returns null when the row stopped matching before the write', async () => {
      db.findOne.mockResolvedValueOnce({ id: 5, documentId: 's1' });
      db.updateMany.mockResolvedValue({ count: 0 });

      const row = await adapter.update({
        model: 'session',
        where: [{ field: 'id', value: 's1' }],
        update: { ipAddress: '1.2.3.4' },
      });

      expect(row).toBeNull();
    });

    it('returns null when nothing matches an engine table', async () => {
      const row = await adapter.update({
        model: 'session',
        where: [{ field: 'id', value: 'missing' }],
        update: { ipAddress: '1.2.3.4' },
      });

      expect(row).toBeNull();
      expect(db.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('the users-permissions password', () => {
    const compatOn = () => strapiMock.config.get.mockImplementation(() => true);
    const password = 'hashed-value';
    const userWrites = () =>
      strapiMock.db.query.mock.calls.filter(([uid]) => uid === 'plugin::end-users.user');

    it('mirrors a credential password into the user row with compat on', async () => {
      compatOn();
      documents.create.mockResolvedValue({
        id: 1,
        documentId: 'acc1',
        userId: 'u1',
        providerId: 'credential',
      });

      await adapter.create({
        model: 'account',
        data: { userId: 'u1', providerId: 'credential', accountId: 'u1', password },
      });

      expect(userWrites()).toHaveLength(1);
      expect(db.updateMany).toHaveBeenCalledWith({
        where: { documentId: 'u1' },
        data: { password },
      });
      expect(strapiMock.db.transaction).toHaveBeenCalled();
    });

    it('mirrors a changed password, on update and on updateMany', async () => {
      compatOn();
      db.findOne
        .mockResolvedValueOnce({ id: 5 })
        .mockResolvedValueOnce({ id: 5, userId: 'u1', providerId: 'credential' });
      db.updateMany.mockResolvedValue({ count: 1 });

      await adapter.update({
        model: 'account',
        where: [{ field: 'id', value: 'acc1' }],
        update: { password },
      });

      expect(db.updateMany).toHaveBeenLastCalledWith({
        where: { documentId: 'u1' },
        data: { password },
      });

      db.findMany.mockResolvedValue([{ id: 5, userId: 'u2', providerId: 'credential' }]);

      await adapter.updateMany({
        model: 'account',
        where: [
          { field: 'userId', value: 'u2' },
          { field: 'providerId', value: 'credential' },
        ],
        update: { password },
      });

      expect(db.updateMany).toHaveBeenLastCalledWith({
        where: { documentId: 'u2' },
        data: { password },
      });
    });

    it('mirrors nothing with compat off, or for a provider account', async () => {
      documents.create.mockResolvedValue({ id: 1, documentId: 'acc1', userId: 'u1' });

      await adapter.create({
        model: 'account',
        data: { userId: 'u1', providerId: 'credential', accountId: 'u1', password },
      });

      expect(userWrites()).toHaveLength(0);

      compatOn();
      db.findMany.mockResolvedValue([{ id: 6, userId: 'u1', providerId: 'github' }]);
      db.updateMany.mockResolvedValue({ count: 1 });

      await adapter.create({
        model: 'account',
        data: { userId: 'u1', providerId: 'github', accountId: 'g1', password },
      });
      await adapter.updateMany({
        model: 'account',
        where: [{ field: 'userId', value: 'u1' }],
        update: { password },
      });
      await adapter.updateMany({
        model: 'account',
        where: [{ field: 'userId', value: 'u1' }],
        update: { accessToken: 'token-value' },
      });

      expect(db.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId: 'u1' } })
      );
    });
  });

  describe('delete', () => {
    it('deletes a user through the Document Service, by documentId', async () => {
      documents.findFirst.mockResolvedValue({ id: 3, documentId: 'abc123' });

      await adapter.delete({ model: 'user', where: [{ field: 'email', value: 'a@x.io' }] });

      expect(documents.delete).toHaveBeenCalledWith({ documentId: 'abc123' });
    });

    it('deletes an engine table row with the where in the statement', async () => {
      db.findOne.mockResolvedValueOnce({ id: 5, documentId: 's1' });
      db.deleteMany.mockResolvedValue({ count: 1 });

      await adapter.delete({ model: 'session', where: [{ field: 'token', value: 't' }] });

      expect(db.deleteMany).toHaveBeenCalledWith({
        where: { $and: [{ id: 5 }, { token: { $eq: 't' } }] },
      });
      expect(documents.delete).not.toHaveBeenCalled();
    });

    it('does nothing when nothing matches', async () => {
      await adapter.delete({ model: 'user', where: [{ field: 'email', value: 'a@x.io' }] });
      await adapter.delete({ model: 'session', where: [{ field: 'token', value: 't' }] });

      expect(documents.delete).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
    });

    it('does not pick a row at random when the where is empty', async () => {
      await adapter.delete({ model: 'user', where: [] });
      await adapter.delete({ model: 'session', where: [] });

      expect(documents.findFirst).not.toHaveBeenCalled();
      expect(documents.delete).not.toHaveBeenCalled();
      expect(db.findOne).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('updateMany and deleteMany on the user model', () => {
    it('runs updateMany in one transaction and counts the documents it updated', async () => {
      documents.findMany.mockResolvedValue([
        { documentId: 'a' },
        { documentId: 'b' },
        { documentId: 'c' },
      ]);
      documents.update
        .mockResolvedValueOnce({ documentId: 'a' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ documentId: 'c' });

      const updated = await adapter.updateMany({
        model: 'user',
        where: [{ field: 'name', value: 'guest' }],
        update: { image: 'x.png' },
      });

      expect(strapiMock.db.transaction).toHaveBeenCalledTimes(1);
      expect(documents.update).toHaveBeenCalledTimes(3);
      expect(documents.update).toHaveBeenCalledWith({
        documentId: 'a',
        data: expect.objectContaining({ image: 'x.png' }),
      });
      expect(updated).toBe(2);
    });

    it('runs deleteMany in one transaction', async () => {
      await adapter.deleteMany({ model: 'user', where: [{ field: 'name', value: 'guest' }] });

      expect(strapiMock.db.transaction).toHaveBeenCalledTimes(1);
    });

    it('deletes every matching document and counts only the ones it removed', async () => {
      documents.findMany.mockResolvedValue([{ documentId: 'a' }, { documentId: 'b' }]);
      documents.delete
        .mockResolvedValueOnce({ documentId: 'a', entries: [{ id: 1 }] })
        .mockResolvedValueOnce({ documentId: 'b', entries: [] });

      const deleted = await adapter.deleteMany({
        model: 'user',
        where: [{ field: 'name', value: 'guest' }],
      });

      expect(documents.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { name: { $eq: 'guest' } } })
      );
      expect(documents.delete).toHaveBeenCalledWith({ documentId: 'a' });
      expect(documents.delete).toHaveBeenCalledWith({ documentId: 'b' });
      expect(deleted).toBe(1);
    });

    it('does not write anything when nothing matches', async () => {
      const deleted = await adapter.deleteMany({
        model: 'user',
        where: [{ field: 'name', value: 'nobody' }],
      });

      expect(deleted).toBe(0);
      expect(documents.delete).not.toHaveBeenCalled();
    });

    it('rolls back when a delete fails halfway', async () => {
      documents.findMany.mockResolvedValue([{ documentId: 'a' }, { documentId: 'b' }]);
      documents.delete.mockRejectedValue(new Error('boom'));

      await expect(
        adapter.deleteMany({ model: 'user', where: [{ field: 'name', value: 'guest' }] })
      ).rejects.toThrow('boom');
      // The transaction callback owns the loop, so its rejection is what makes Strapi roll back.
      expect(strapiMock.db.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateMany and deleteMany on an engine table', () => {
    it('updates with one statement and returns that statement’s own count', async () => {
      db.updateMany.mockResolvedValue({ count: 4 });

      const updated = await adapter.updateMany({
        model: 'session',
        where: [{ field: 'userId', value: 'abc123' }],
        update: { ipAddress: '1.2.3.4' },
      });

      expect(updated).toBe(4);
      expect(db.updateMany).toHaveBeenCalledTimes(1);
      expect(db.updateMany).toHaveBeenCalledWith({
        where: { userId: { $eq: 'abc123' } },
        data: expect.objectContaining({ ipAddress: '1.2.3.4' }),
      });
      // No read first, so nothing for a concurrent writer to slip in behind.
      expect(documents.findMany).not.toHaveBeenCalled();
      expect(documents.update).not.toHaveBeenCalled();
      expect(strapiMock.db.transaction).not.toHaveBeenCalled();
    });

    it('deletes with one statement and returns that statement’s own count', async () => {
      db.deleteMany.mockResolvedValue({ count: 2 });

      const deleted = await adapter.deleteMany({
        model: 'session',
        where: [{ field: 'userId', value: 'abc123' }],
      });

      expect(deleted).toBe(2);
      expect(db.deleteMany).toHaveBeenCalledTimes(1);
      expect(db.deleteMany).toHaveBeenCalledWith({ where: { userId: { $eq: 'abc123' } } });
      expect(documents.findMany).not.toHaveBeenCalled();
      expect(documents.delete).not.toHaveBeenCalled();
      expect(strapiMock.db.transaction).not.toHaveBeenCalled();
    });

    it('reports 0 when the statement matched nothing', async () => {
      expect(
        await adapter.deleteMany({
          model: 'session',
          where: [{ field: 'userId', value: 'nobody' }],
        })
      ).toBe(0);
    });
  });

  describe('consumeOne', () => {
    const verification = {
      id: 7,
      documentId: 'v1',
      identifier: 'reset-password:abc',
      value: 'user-1',
      expiresAt: '2026-10-28T10:00:00.000Z',
    };

    it('deletes the row with a statement that has its id and where, and returns it', async () => {
      db.findOne.mockResolvedValue(verification);
      db.deleteMany.mockResolvedValue({ count: 1 });

      const row = await adapter.consumeOne<{ id: string; expiresAt: Date }>({
        model: 'verification',
        where: [{ field: 'id', value: 'v1' }],
      });

      expect(db.deleteMany).toHaveBeenCalledWith({
        where: { $and: [{ id: 7 }, { documentId: { $eq: 'v1' } }] },
      });
      expect(row).toMatchObject({ id: 'v1' });
      expect(row?.expiresAt).toEqual(new Date('2026-10-28T10:00:00.000Z'));
      expect(strapiMock.db.transaction).toHaveBeenCalledTimes(1);
    });

    it('returns null, and deletes nothing, when the row is already gone', async () => {
      db.findOne.mockResolvedValue(null);

      expect(
        await adapter.consumeOne({ model: 'verification', where: [{ field: 'id', value: 'v1' }] })
      ).toBeNull();
      expect(db.deleteMany).not.toHaveBeenCalled();
    });

    it('returns null for the caller that lost the race: its DELETE removed nothing', async () => {
      // Both callers read the row; the other one's DELETE ran first, so this one removes 0 rows.
      db.findOne.mockResolvedValue(verification);
      db.deleteMany.mockResolvedValue({ count: 0 });

      expect(
        await adapter.consumeOne({ model: 'verification', where: [{ field: 'id', value: 'v1' }] })
      ).toBeNull();
    });

    it('returns null when the database refuses the DELETE because the row changed since it was read', async () => {
      // MariaDB with snapshot isolation: error 1020 instead of a count of 0
      db.findOne.mockResolvedValue(verification);
      db.deleteMany.mockRejectedValue(
        Object.assign(new Error('Record has changed'), { errno: 1020 })
      );

      expect(
        await adapter.consumeOne({ model: 'verification', where: [{ field: 'id', value: 'v1' }] })
      ).toBeNull();
    });

    it('returns null for the driver code of that error when it carries no number', async () => {
      db.findOne.mockResolvedValue(verification);
      db.deleteMany.mockRejectedValue(
        Object.assign(new Error('Record has changed'), { code: 'ER_CHECKREAD' })
      );

      expect(
        await adapter.consumeOne({ model: 'verification', where: [{ field: 'id', value: 'v1' }] })
      ).toBeNull();
    });

    it('lets any other database error out', async () => {
      db.findOne.mockResolvedValue(verification);
      db.deleteMany.mockRejectedValue(Object.assign(new Error('disk full'), { errno: 1114 }));

      await expect(
        adapter.consumeOne({ model: 'verification', where: [{ field: 'id', value: 'v1' }] })
      ).rejects.toThrow('disk full');
    });

    it('refuses the user model and an empty where', async () => {
      await expect(
        adapter.consumeOne({ model: 'user', where: [{ field: 'id', value: 'u1' }] })
      ).rejects.toThrow(/consumeOne.*user/);
      await expect(adapter.consumeOne({ model: 'verification', where: [] })).rejects.toThrow(
        /consumeOne/
      );
      expect(db.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('incrementOne', () => {
    it('adds the delta to the locked row and returns the updated row', async () => {
      queryBuilder.execute.mockResolvedValue({
        id: 3,
        documentId: 'tf1',
        failedVerificationCount: 2,
      });
      db.updateMany.mockResolvedValue({ count: 1 });
      db.findOne.mockResolvedValue({ id: 3, documentId: 'tf1', failedVerificationCount: 3 });

      const row = await adapter.incrementOne<{ id: string; failedVerificationCount: number }>({
        model: 'twoFactor',
        where: [{ field: 'id', value: 'tf1' }],
        increment: { failedVerificationCount: 1 },
      });

      // The row is locked first, so a concurrent caller waits and then adds to what this one wrote.
      expect(strapiMock.db.queryBuilder).toHaveBeenCalledWith('plugin::end-users.two-factor');
      expect(queryBuilder.where).toHaveBeenCalledWith({ documentId: { $eq: 'tf1' } });
      expect(queryBuilder.forUpdate).toHaveBeenCalledTimes(1);
      expect(db.updateMany).toHaveBeenCalledWith({
        where: { $and: [{ id: 3 }, { documentId: { $eq: 'tf1' } }] },
        data: { failedVerificationCount: 3 },
      });
      expect(row).toMatchObject({ id: 'tf1', failedVerificationCount: 3 });
      expect(strapiMock.db.transaction).toHaveBeenCalledTimes(1);
    });

    it('counts a missing counter as 0', async () => {
      queryBuilder.execute.mockResolvedValue({
        id: 3,
        documentId: 'tf1',
        failedVerificationCount: null,
      });
      db.updateMany.mockResolvedValue({ count: 1 });

      await adapter.incrementOne({
        model: 'twoFactor',
        where: [{ field: 'id', value: 'tf1' }],
        increment: { failedVerificationCount: 1 },
      });

      expect(db.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { failedVerificationCount: 1 } })
      );
    });

    it('sets values alongside the increments, null and dates included', async () => {
      const lockedUntil = new Date('2026-10-28T10:00:00.000Z');
      queryBuilder.execute.mockResolvedValue({ id: 3, documentId: 'tf1', lockedUntil: null });
      db.updateMany.mockResolvedValue({ count: 1 });

      await adapter.incrementOne({
        model: 'twoFactor',
        where: [{ field: 'id', value: 'tf1' }],
        increment: { failedVerificationCount: 1 },
        set: { lockedUntil },
      });
      await adapter.incrementOne({
        model: 'twoFactor',
        where: [{ field: 'id', value: 'tf1' }],
        increment: {},
        set: { failedVerificationCount: 0, lockedUntil: null },
      });

      expect(db.updateMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ data: { lockedUntil, failedVerificationCount: 1 } })
      );
      expect(db.updateMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: { failedVerificationCount: 0, lockedUntil: null } })
      );
    });

    it('assigns without incrementing when only set is given (the rate limiter)', async () => {
      queryBuilder.execute.mockResolvedValue({ id: 9, documentId: 'r1', count: 4, lastRequest: 1 });
      db.updateMany.mockResolvedValue({ count: 1 });
      db.findOne.mockResolvedValue({ id: 9, documentId: 'r1', count: 1, lastRequest: 5 });

      const row = await adapter.incrementOne({
        model: 'rateLimit',
        where: [
          { field: 'key', value: 'ip:/sign-in' },
          { field: 'lastRequest', operator: 'lte', value: 1 },
        ],
        increment: {},
        set: { count: 1, lastRequest: 5 },
      });

      expect(queryBuilder.where).toHaveBeenCalledWith({
        $and: [{ key: { $eq: 'ip:/sign-in' } }, { lastRequest: { $lte: 1 } }],
      });
      expect(db.updateMany).toHaveBeenCalledWith({
        where: {
          $and: [
            { id: 9 },
            { $and: [{ key: { $eq: 'ip:/sign-in' } }, { lastRequest: { $lte: 1 } }] },
          ],
        },
        data: { count: 1, lastRequest: 5 },
      });
      expect(row).toMatchObject({ id: 'r1', count: 1, lastRequest: 5 });
    });

    it('returns null, and writes nothing, when the guard matches no row', async () => {
      // The locked read applies the where, so a guard another caller already broke finds nothing.
      queryBuilder.execute.mockResolvedValue(null);

      const row = await adapter.incrementOne({
        model: 'twoFactor',
        where: [
          { field: 'id', value: 'tf1' },
          { field: 'failedVerificationCount', operator: 'gte', value: 5 },
        ],
        increment: {},
        set: { lockedUntil: new Date() },
      });

      expect(row).toBeNull();
      expect(queryBuilder.where).toHaveBeenCalledWith({
        $and: [{ documentId: { $eq: 'tf1' } }, { failedVerificationCount: { $gte: 5 } }],
      });
      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it('returns null when the update itself matched no row', async () => {
      queryBuilder.execute.mockResolvedValue({ id: 3, documentId: 'tf1' });
      db.updateMany.mockResolvedValue({ count: 0 });

      expect(
        await adapter.incrementOne({
          model: 'twoFactor',
          where: [{ field: 'id', value: 'tf1' }],
          increment: { failedVerificationCount: 1 },
        })
      ).toBeNull();
      expect(db.findOne).not.toHaveBeenCalled();
    });

    it('refuses a counter that is not a number', async () => {
      queryBuilder.execute.mockResolvedValue({
        id: 3,
        documentId: 'tf1',
        failedVerificationCount: 'many',
      });

      await expect(
        adapter.incrementOne({
          model: 'twoFactor',
          where: [{ field: 'id', value: 'tf1' }],
          increment: { failedVerificationCount: 1 },
        })
      ).rejects.toThrow(/failedVerificationCount/);
      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it('refuses the user model and an empty where', async () => {
      await expect(
        adapter.incrementOne({
          model: 'user',
          where: [{ field: 'id', value: 'u1' }],
          increment: { name: 1 },
        })
      ).rejects.toThrow(/incrementOne.*user/);
      await expect(
        adapter.incrementOne({
          model: 'twoFactor',
          where: [],
          increment: { failedVerificationCount: 1 },
        })
      ).rejects.toThrow(/incrementOne/);
      expect(db.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('filters fail closed', () => {
    it('refuses an empty where in updateMany, deleteMany and findOne', async () => {
      await expect(
        adapter.updateMany({ model: 'session', where: [], update: { ipAddress: 'x' } })
      ).rejects.toThrow(/updateMany/);
      await expect(adapter.deleteMany({ model: 'session', where: [] })).rejects.toThrow(
        /deleteMany/
      );
      await expect(adapter.deleteMany({ model: 'user', where: [] })).rejects.toThrow(/deleteMany/);
      await expect(adapter.findOne({ model: 'session', where: [] })).rejects.toThrow(/findOne/);

      expect(db.updateMany).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
      expect(documents.findFirst).not.toHaveBeenCalled();
    });

    it('still lists and counts without a where', async () => {
      await expect(adapter.findMany({ model: 'session' })).resolves.toEqual([]);
      await expect(adapter.count({ model: 'session' })).resolves.toBe(0);
    });

    it('refuses a where field that is not an attribute, which Strapi would silently drop', async () => {
      // `userAgent` is a Better Auth session field; here the content type has no such attribute.
      strapiMock.getModel.mockReturnValue({ attributes: { userId: { type: 'string' } } });

      const where = [{ field: 'userAgent', value: 'curl' }];

      await expect(adapter.findMany({ model: 'session', where })).rejects.toThrow(/userAgent/);
      await expect(adapter.findOne({ model: 'session', where })).rejects.toThrow(/userAgent/);
      await expect(adapter.count({ model: 'session', where })).rejects.toThrow(/userAgent/);
      await expect(adapter.deleteMany({ model: 'session', where })).rejects.toThrow(/userAgent/);
      await expect(
        adapter.updateMany({ model: 'session', where, update: { ipAddress: 'x' } })
      ).rejects.toThrow(/userAgent/);
      await expect(adapter.consumeOne({ model: 'session', where })).rejects.toThrow(/userAgent/);

      expect(documents.findMany).not.toHaveBeenCalled();
      expect(documents.findFirst).not.toHaveBeenCalled();
      expect(documents.count).not.toHaveBeenCalled();
      expect(db.deleteMany).not.toHaveBeenCalled();
      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it('does not take an inherited name for an attribute of the content type', async () => {
      // `in` and plain property access find names on the prototype chain; only the content type's
      // own attributes are ones Strapi will filter on
      strapiMock.getModel.mockReturnValue({
        attributes: Object.create({ userAgent: { type: 'string' } }, { userId: { value: {} } }),
      });

      await expect(
        adapter.findOne({ model: 'session', where: [{ field: 'userAgent', value: 'curl' }] })
      ).rejects.toThrow(/userAgent/);

      expect(documents.findFirst).not.toHaveBeenCalled();
    });

    it('refuses a where field that is a password attribute, which Strapi never filters on', async () => {
      strapiMock.getModel.mockReturnValue({ attributes: { token: { type: 'password' } } });

      await expect(
        adapter.findOne({ model: 'session', where: [{ field: 'token', value: 't' }] })
      ).rejects.toThrow(/token.*password/);
      expect(documents.findFirst).not.toHaveBeenCalled();
    });

    it('always allows the id, which is the documentId', async () => {
      strapiMock.getModel.mockReturnValue({ attributes: {} });

      await adapter.findOne({ model: 'session', where: [{ field: 'id', value: 's1' }] });

      expect(documents.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ filters: { documentId: { $eq: 's1' } } })
      );
    });
  });

  describe('increments and assignments fail closed too', () => {
    // Strapi drops a data key that is not an attribute without saying so: a counter that is never
    // incremented, or a lock that is never set, is as unsafe as a filter that matches every row.
    const twoFactor = { userId: { type: 'string' }, secret: { type: 'string' } };

    it('refuses to increment a field that is not an attribute', async () => {
      strapiMock.getModel.mockReturnValue({ attributes: twoFactor });

      await expect(
        adapter.incrementOne({
          model: 'twoFactor',
          where: [{ field: 'id', value: 'tf1' }],
          increment: { failedVerificationCount: 1 },
        })
      ).rejects.toThrow(/failedVerificationCount/);

      expect(queryBuilder.forUpdate).not.toHaveBeenCalled();
      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it('refuses to set a field that is not an attribute', async () => {
      strapiMock.getModel.mockReturnValue({
        attributes: { ...twoFactor, failedVerificationCount: { type: 'integer' } },
      });

      await expect(
        adapter.incrementOne({
          model: 'twoFactor',
          where: [{ field: 'id', value: 'tf1' }],
          increment: { failedVerificationCount: 1 },
          set: { lockedUntil: new Date() },
        })
      ).rejects.toThrow(/lockedUntil/);

      expect(queryBuilder.forUpdate).not.toHaveBeenCalled();
      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it('does not take an inherited name for an attribute to increment or set', async () => {
      strapiMock.getModel.mockReturnValue({
        attributes: Object.create(
          { failedVerificationCount: { type: 'integer' }, lockedUntil: { type: 'datetime' } },
          { userId: { value: {} } }
        ),
      });

      await expect(
        adapter.incrementOne({
          model: 'twoFactor',
          where: [{ field: 'id', value: 'tf1' }],
          increment: { failedVerificationCount: 1 },
        })
      ).rejects.toThrow(/failedVerificationCount/);
      await expect(
        adapter.incrementOne({
          model: 'twoFactor',
          where: [{ field: 'id', value: 'tf1' }],
          increment: {},
          set: { lockedUntil: null },
        })
      ).rejects.toThrow(/lockedUntil/);

      expect(db.updateMany).not.toHaveBeenCalled();
    });

    it('takes fields that are attributes, in increment and in set', async () => {
      strapiMock.getModel.mockReturnValue({
        attributes: {
          ...twoFactor,
          failedVerificationCount: { type: 'integer' },
          lockedUntil: { type: 'datetime' },
        },
      });
      queryBuilder.execute.mockResolvedValue({
        id: 3,
        documentId: 'tf1',
        failedVerificationCount: 0,
      });
      db.updateMany.mockResolvedValue({ count: 1 });

      await adapter.incrementOne({
        model: 'twoFactor',
        where: [{ field: 'id', value: 'tf1' }],
        increment: { failedVerificationCount: 1 },
        set: { lockedUntil: null },
      });

      expect(db.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('database errors', () => {
    const bound = ['SECRET', 'TOKEN'].join('-');
    const failure = () =>
      Object.assign(
        new Error(
          `insert into \`eu_sessions\` (\`token\`) values ('${bound}') - UNIQUE constraint failed`
        ),
        { code: 'SQLITE_CONSTRAINT', sql: 'insert into `eu_sessions` (`token`) values (?)' }
      );

    it('rethrows a failed write with its code and without the query or the bound values', async () => {
      documents.create.mockRejectedValue(failure());

      const error = await adapter
        .create({ model: 'session', data: { token: 'x' } })
        .catch((thrown: Error & { code?: string }) => thrown);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('SQLITE_CONSTRAINT');
      expect((error as Error).message).not.toMatch(/SECRET|insert into|eu_sessions/);
      expect((error as { code?: string }).code).toBe('SQLITE_CONSTRAINT');
      expect((error as { sql?: string }).sql).toBeUndefined();
      expect((error as { cause?: unknown }).cause).toBeUndefined();
    });

    it('does the same on the other write paths', async () => {
      db.deleteMany.mockRejectedValue(failure());
      db.findOne.mockResolvedValue({ id: 1, documentId: 'v1' });
      db.updateMany.mockRejectedValue(failure());

      for (const run of [
        () => adapter.deleteMany({ model: 'session', where: [{ field: 'userId', value: 'u1' }] }),
        () => adapter.consumeOne({ model: 'verification', where: [{ field: 'id', value: 'v1' }] }),
        () =>
          adapter.updateMany({
            model: 'session',
            where: [{ field: 'userId', value: 'u1' }],
            update: { token: 'x' },
          }),
      ]) {
        // eslint-disable-next-line no-await-in-loop
        await expect(run()).rejects.toThrow(
          /^The database refused .* \(error code SQLITE_CONSTRAINT\)\.$/
        );
      }
    });

    it('leaves an error that is not the database`s as it was', async () => {
      const refused = new Error('Not allowed');

      documents.create.mockRejectedValue(refused);

      await expect(adapter.create({ model: 'session', data: { token: 'x' } })).rejects.toBe(
        refused
      );
    });
  });

  describe('transaction', () => {
    it('runs Better Auth multi-step work in a Strapi database transaction', async () => {
      const result = await adapter.transaction(async (trx) => {
        await trx.count({ model: 'session' });
        return 'done';
      });

      expect(result).toBe('done');
      expect(strapiMock.db.transaction).toHaveBeenCalledTimes(1);
      expect(documents.count).toHaveBeenCalledTimes(1);
    });
  });
});

describe('transformFilters', () => {
  it('maps every Better Auth operator to its Strapi operator', () => {
    const cases = [
      ['eq', '$eq'],
      ['ne', '$ne'],
      ['gt', '$gt'],
      ['gte', '$gte'],
      ['lt', '$lt'],
      ['lte', '$lte'],
      ['contains', '$contains'],
      ['starts_with', '$startsWith'],
      ['ends_with', '$endsWith'],
    ] as const;

    for (const [operator, strapiOperator] of cases) {
      expect(
        transformFilters([
          { field: 'name', value: 'x', operator, connector: 'AND', mode: 'sensitive' },
        ])
      ).toEqual({ name: { [strapiOperator]: 'x' } });
    }

    expect(
      transformFilters([
        { field: 'name', value: ['x', 'y'], operator: 'in', connector: 'AND', mode: 'sensitive' },
      ])
    ).toEqual({ name: { $in: ['x', 'y'] } });
    expect(
      transformFilters([
        {
          field: 'name',
          value: ['x', 'y'],
          operator: 'not_in',
          connector: 'AND',
          mode: 'sensitive',
        },
      ])
    ).toEqual({ name: { $notIn: ['x', 'y'] } });
  });

  it('matches null with $eq and $ne', () => {
    expect(
      transformFilters([
        { field: 'image', value: null, operator: 'eq', connector: 'AND', mode: 'sensitive' },
      ])
    ).toEqual({ image: { $eq: null } });
  });

  it('returns no filter for an empty or missing where', () => {
    expect(transformFilters([])).toEqual({});
    expect(transformFilters(undefined)).toEqual({});
  });

  it('keeps two conditions on the same field instead of overwriting one with the other', () => {
    expect(
      transformFilters([
        {
          field: 'expiresAt',
          value: new Date(1),
          operator: 'gt',
          connector: 'AND',
          mode: 'sensitive',
        },
        {
          field: 'expiresAt',
          value: new Date(9),
          operator: 'lt',
          connector: 'AND',
          mode: 'sensitive',
        },
      ])
    ).toEqual({
      $and: [{ expiresAt: { $gt: new Date(1) } }, { expiresAt: { $lt: new Date(9) } }],
    });
  });

  it('combines the AND group with the OR group, the way the SQL adapters do', () => {
    expect(
      transformFilters([
        { field: 'userId', value: 'u1', operator: 'eq', connector: 'AND', mode: 'sensitive' },
        { field: 'email', value: 'a@x.io', operator: 'eq', connector: 'OR', mode: 'sensitive' },
        { field: 'name', value: 'a', operator: 'eq', connector: 'OR', mode: 'sensitive' },
      ])
    ).toEqual({
      $and: [
        { userId: { $eq: 'u1' } },
        { $or: [{ email: { $eq: 'a@x.io' } }, { name: { $eq: 'a' } }] },
      ],
    });

    expect(
      transformFilters([
        { field: 'email', value: 'a@x.io', operator: 'eq', connector: 'OR', mode: 'sensitive' },
        { field: 'name', value: 'a', operator: 'eq', connector: 'OR', mode: 'sensitive' },
      ])
    ).toEqual({ $or: [{ email: { $eq: 'a@x.io' } }, { name: { $eq: 'a' } }] });
  });

  it('uses the case-insensitive Strapi operators for insensitive string matches', () => {
    expect(
      transformFilters([
        { field: 'email', value: 'A@x.io', operator: 'eq', connector: 'AND', mode: 'insensitive' },
      ])
    ).toEqual({ email: { $eqi: 'A@x.io' } });
    expect(
      transformFilters([
        { field: 'email', value: 'A@x.io', operator: 'ne', connector: 'AND', mode: 'insensitive' },
      ])
    ).toEqual({ email: { $nei: 'A@x.io' } });
    expect(
      transformFilters([
        { field: 'email', value: 'x', operator: 'contains', connector: 'AND', mode: 'insensitive' },
      ])
    ).toEqual({ email: { $containsi: 'x' } });
    expect(
      transformFilters([
        {
          field: 'email',
          value: 'x',
          operator: 'starts_with',
          connector: 'AND',
          mode: 'insensitive',
        },
      ])
    ).toEqual({ email: { $startsWithi: 'x' } });
    expect(
      transformFilters([
        {
          field: 'email',
          value: 'x',
          operator: 'ends_with',
          connector: 'AND',
          mode: 'insensitive',
        },
      ])
    ).toEqual({ email: { $endsWithi: 'x' } });
  });

  it('expands insensitive in and not_in, and keeps an empty list matching nothing', () => {
    expect(
      transformFilters([
        {
          field: 'email',
          value: ['A', 'B'],
          operator: 'in',
          connector: 'AND',
          mode: 'insensitive',
        },
      ])
    ).toEqual({ $or: [{ email: { $eqi: 'A' } }, { email: { $eqi: 'B' } }] });
    expect(
      transformFilters([
        {
          field: 'email',
          value: ['A', 'B'],
          operator: 'not_in',
          connector: 'AND',
          mode: 'insensitive',
        },
      ])
    ).toEqual({ $and: [{ email: { $nei: 'A' } }, { email: { $nei: 'B' } }] });
    expect(
      transformFilters([
        { field: 'email', value: [], operator: 'in', connector: 'AND', mode: 'insensitive' },
      ])
    ).toEqual({ email: { $in: [] } });
  });
});
