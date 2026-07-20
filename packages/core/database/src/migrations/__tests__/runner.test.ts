import { createMigrationRunner } from '../runner';

import type { RunnableMigration } from '../runner';

describe('createMigrationRunner', () => {
  const createMocks = (migrations: RunnableMigration[], executed: string[] = []) => {
    const storage = {
      executed: jest.fn().mockResolvedValue([...executed]),
      logMigration: jest.fn().mockResolvedValue(undefined),
      unlogMigration: jest.fn().mockResolvedValue(undefined),
    };

    const logger = {
      info: jest.fn(),
    };

    const runner = createMigrationRunner({
      storage,
      logger,
      getMigrations: jest.fn().mockResolvedValue(migrations),
    });

    return { runner, storage, logger };
  };

  const migrations: RunnableMigration[] = [
    {
      name: '001-first.js',
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    },
    {
      name: '002-second.js',
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    },
    {
      name: '003-third.js',
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('pending', () => {
    it('returns empty when all migrations are executed', async () => {
      const { runner } = createMocks(migrations, ['001-first.js', '002-second.js', '003-third.js']);

      await expect(runner.pending()).resolves.toEqual([]);
    });

    it('returns unexecuted migrations in definition order', async () => {
      const { runner } = createMocks(migrations, ['001-first.js']);

      await expect(runner.pending()).resolves.toEqual([
        { name: '002-second.js', path: undefined },
        { name: '003-third.js', path: undefined },
      ]);
    });
  });

  describe('up', () => {
    it('runs pending migrations sequentially and logs each', async () => {
      const { runner, storage, logger } = createMocks(migrations);

      await runner.up();

      expect(migrations[0].up).toHaveBeenCalledTimes(1);
      expect(migrations[1].up).toHaveBeenCalledTimes(1);
      expect(migrations[2].up).toHaveBeenCalledTimes(1);
      expect(storage.logMigration).toHaveBeenNthCalledWith(1, { name: '001-first.js' });
      expect(storage.logMigration).toHaveBeenNthCalledWith(2, { name: '002-second.js' });
      expect(storage.logMigration).toHaveBeenNthCalledWith(3, { name: '003-third.js' });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'migrating', name: '001-first.js' })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'migrated', name: '003-third.js' })
      );
    });

    it('stops on first failure and does not log the failed migration', async () => {
      const cause = new Error('boom');
      const failingMigrations: RunnableMigration[] = [
        {
          name: '001-first.js',
          up: jest.fn().mockResolvedValue(undefined),
          down: jest.fn(),
        },
        {
          name: '002-second.js',
          up: jest.fn().mockRejectedValue(cause),
          down: jest.fn(),
        },
        {
          name: '003-third.js',
          up: jest.fn().mockResolvedValue(undefined),
          down: jest.fn(),
        },
      ];

      const { runner, storage } = createMocks(failingMigrations);

      await expect(runner.up()).rejects.toMatchObject({
        message: 'Migration 002-second.js (up) failed: Original error: boom',
        cause,
      });

      expect(failingMigrations[0].up).toHaveBeenCalledTimes(1);
      expect(failingMigrations[1].up).toHaveBeenCalledTimes(1);
      expect(failingMigrations[2].up).not.toHaveBeenCalled();
      expect(storage.logMigration).toHaveBeenCalledTimes(1);
      expect(storage.logMigration).toHaveBeenCalledWith({ name: '001-first.js' });
    });

    it('is idempotent when re-run after successful up', async () => {
      const executed: string[] = [];
      const storage = {
        executed: jest.fn().mockImplementation(async () => [...executed]),
        logMigration: jest.fn().mockImplementation(async ({ name }: { name: string }) => {
          executed.push(name);
        }),
        unlogMigration: jest.fn(),
      };

      const runner = createMigrationRunner({
        storage,
        logger: { info: jest.fn() },
        getMigrations: jest.fn().mockResolvedValue(migrations),
      });

      await runner.up();
      await runner.up();

      expect(migrations[0].up).toHaveBeenCalledTimes(1);
      expect(migrations[1].up).toHaveBeenCalledTimes(1);
      expect(migrations[2].up).toHaveBeenCalledTimes(1);
    });
  });

  describe('down', () => {
    it('reverts the last executed migration in definition order', async () => {
      const { runner, storage, logger } = createMocks(migrations, [
        '001-first.js',
        '002-second.js',
      ]);

      await runner.down();

      expect(migrations[1].down).toHaveBeenCalledTimes(1);
      expect(migrations[0].down).not.toHaveBeenCalled();
      expect(storage.unlogMigration).toHaveBeenCalledWith({ name: '002-second.js' });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'reverting', name: '002-second.js' })
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'reverted', name: '002-second.js' })
      );
    });

    it('wraps down failures with migration name, direction, and cause', async () => {
      const cause = new Error('revert failed');
      const failingMigrations: RunnableMigration[] = [
        {
          name: '001-first.js',
          up: jest.fn(),
          down: jest.fn().mockRejectedValue(cause),
        },
      ];

      const { runner, storage } = createMocks(failingMigrations, ['001-first.js']);

      await expect(runner.down()).rejects.toMatchObject({
        message: 'Migration 001-first.js (down) failed: Original error: revert failed',
        cause,
      });
      expect(storage.unlogMigration).not.toHaveBeenCalled();
    });

    it('does nothing when no migrations have been executed', async () => {
      const { runner, storage } = createMocks(migrations);

      await runner.down();

      expect(storage.unlogMigration).not.toHaveBeenCalled();
      migrations.forEach((migration) => {
        expect(migration.down).not.toHaveBeenCalled();
      });
    });
  });
});
