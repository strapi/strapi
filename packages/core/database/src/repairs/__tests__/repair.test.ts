import { Database } from '../..';
import { createRepairManager } from '../index';
import { removeOrphanMorphType } from '../operations/remove-orphan-morph-types';

jest.mock('../index', () => ({
  createRepairManager: jest.fn(() => ({
    removeOrphanMorphType: jest.requireActual('../operations/remove-orphan-morph-types')
      .removeOrphanMorphType,
  })),
}));

jest.mock('../../migrations', () => ({
  createMigrationsProvider: jest.fn(() => ({})),
}));

jest.mock('../../schema', () => ({
  createSchemaProvider: jest.fn(() => ({})),
}));

jest.mock('../../lifecycles', () => ({
  createLifecyclesProvider: jest.fn(() => ({})),
}));

jest.mock('../../entity-manager', () => ({
  createEntityManager: jest.fn(() => ({})),
}));

jest.mock('../../metadata', () => ({
  createMetadata: jest.fn(() => ({})),
}));

describe('Database Repair Manager', () => {
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      connection: {
        client: 'sqlite',
        connection: { filename: ':memory:' },
        useNullAsDefault: true, // Suppress SQLite warnings
      },
      settings: {},
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };
  });

  it('should initialize with a repair manager containing removeOrphanMorphType', () => {
    const database = new Database(mockConfig);

    expect(createRepairManager).toHaveBeenCalledWith(database);
    expect(database.repair).toBeDefined();
    expect(database.repair.removeOrphanMorphType).toBeDefined();
    expect(typeof database.repair.removeOrphanMorphType).toBe('function');
    expect(database.repair.removeOrphanMorphType).toBe(removeOrphanMorphType);
  });
});
