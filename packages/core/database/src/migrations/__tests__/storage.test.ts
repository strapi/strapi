import { createStorage } from '../storage';

import { Database } from '../..';

describe('createStorage', () => {
  let db: Database;
  let tableName: string;
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    db = {
      getSchemaConnection: jest.fn().mockReturnValue({
        hasTable: jest.fn().mockResolvedValue(false),
        createTable: jest.fn().mockResolvedValue(undefined),
        alterTable: jest.fn().mockResolvedValue(undefined),
      }),
      getConnection: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          into: jest.fn().mockResolvedValue(undefined),
        }),
        del: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any;

    tableName = 'migrations';
    storage = createStorage({ db, tableName });
  });

  describe('tryClaimMigration', () => {
    it('returns true when the migration name can be inserted', async () => {
      const name = '20220101120000_create_users_table';

      await expect(storage.tryClaimMigration({ name })).resolves.toBe(true);

      expect(db.getConnection().insert).toHaveBeenCalledWith(
        expect.objectContaining({ name, time: expect.any(Date) })
      );
    });

    it('returns false when the migration name is already claimed', async () => {
      const name = '20220101120000_create_users_table';
      const duplicateError = Object.assign(new Error('UNIQUE constraint failed'), {
        code: 'SQLITE_CONSTRAINT_UNIQUE',
      });

      (db.getConnection().insert({}).into as jest.Mock).mockRejectedValueOnce(duplicateError);

      await expect(storage.tryClaimMigration({ name })).resolves.toBe(false);
    });
  });

  describe('logMigration', () => {
    it('should insert a new migration log', async () => {
      const name = '20220101120000_create_users_table';

      await storage.logMigration({ name });

      expect(db.getConnection().insert).toHaveBeenCalledWith(
        expect.objectContaining({ name, time: expect.any(Date) })
      );
      expect(db.getConnection().insert({}).into).toHaveBeenCalledWith(tableName);
    });
  });

  describe('unlogMigration', () => {
    it('should delete a migration log', async () => {
      const name = '20220101120000_create_users_table';

      await storage.unlogMigration({ name });

      expect(db.getConnection().del).toHaveBeenCalled();
      expect(db.getConnection().del().where).toHaveBeenCalledWith({ name });
    });
  });

  describe('executed', () => {
    it('should create migration table if it does not exist', async () => {
      await storage.executed();

      expect(db.getSchemaConnection().hasTable).toHaveBeenCalledWith(tableName);
      expect(db.getSchemaConnection().createTable).toHaveBeenCalledWith(
        tableName,
        expect.any(Function)
      );
    });

    it('should return an empty array if no migration has been executed', async () => {
      const result = await storage.executed();

      expect(result).toEqual([]);
    });

    it('should return an array of executed migration names', async () => {
      const logs = [
        { name: '20220101120000_create_users_table' },
        { name: '20220101130000_create_posts_table' },
      ];

      (db.getSchemaConnection().hasTable as jest.Mock).mockResolvedValue(true);
      (db.getConnection().select().from('').orderBy as jest.Mock).mockResolvedValue(logs);

      const result = await storage.executed();

      expect(result).toEqual([
        '20220101120000_create_users_table',
        '20220101130000_create_posts_table',
      ]);
    });
  });
});
