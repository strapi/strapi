import { Database } from '../..';
import { createRepairManager } from '../index';
import { removeOrphanMorphType } from '../operations/remove-orphan-morph-types';
import { createConnection } from '../../connection';

// Mock all the dependencies
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
  createLifecyclesProvider: jest.fn(() => ({
    clear: jest.fn(),
  })),
}));

jest.mock('../../entity-manager', () => ({
  createEntityManager: jest.fn(() => ({})),
}));

jest.mock('../../metadata', () => ({
  createMetadata: jest.fn(() => ({})),
}));

jest.mock('../../connection', () => ({
  createConnection: jest.fn(),
}));

describe('Database Repair Manager', () => {
  let mockKnex: any;
  let mockConfig: any;

  beforeEach(() => {
    // Mock Knex instance
    mockKnex = {
      destroy: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn(),
      client: {
        connectionSettings: {},
      },
      schema: {
        withSchema: jest.fn().mockReturnThis(),
      },
      raw: jest.fn().mockResolvedValue({}), // Mock raw SQL execution
    };

    // Mock Configuration
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

    // Mock the `createConnection` function to return the mocked Knex instance
    (createConnection as jest.Mock).mockReturnValue(mockKnex);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a repair manager containing removeOrphanMorphType', async () => {
    const database = new Database(mockConfig);

    // Assertions
    expect(createRepairManager).toHaveBeenCalledWith(database);
    expect(database.repair).toBeDefined();
    expect(database.repair.removeOrphanMorphType).toBeDefined();
    expect(typeof database.repair.removeOrphanMorphType).toBe('function');
    expect(database.repair.removeOrphanMorphType).toBe(removeOrphanMorphType);

    // Simulate database destruction
    await database.destroy();
    expect(mockKnex.destroy).toHaveBeenCalled();
  });
});
