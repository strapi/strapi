import { Database, DatabaseConfig } from '../index';
import { routingCtx } from '../routing-context';
import { transactionCtx } from '../transaction-context';

const makeFakeKnex = (tag: string) =>
  ({
    tag,
    client: { connectionSettings: {} },
    destroy: jest.fn(async () => undefined),
    raw: jest.fn(async () => undefined),
    transaction: jest.fn(async () => ({
      commit: jest.fn(),
      rollback: jest.fn(),
      isCompleted: () => false,
    })),
  }) as any;

const mockWriter = makeFakeKnex('writer');
const mockReader = makeFakeKnex('reader');

jest.mock('../connection', () => ({
  createConnection: jest.fn(() => mockWriter),
  createReadReplicaConnection: jest.fn((cfg: any) => (cfg?.readReplica ? mockReader : undefined)),
}));

jest.mock('../dialects', () => ({
  getDialect: jest.fn(() => ({
    configure: jest.fn(),
    initialize: jest.fn(),
    useReturning: () => false,
  })),
}));

jest.mock('../migrations', () => ({
  createMigrationsProvider: jest.fn(),
}));

const baseConnection = {
  client: 'postgres' as const,
  connection: {
    host: 'writer.example.com',
    port: 5432,
    database: 'strapi',
    user: 'strapi',
    password: 'secret',
  },
};

const withReplicaConfig: DatabaseConfig = {
  connection: {
    ...baseConnection,
    readReplica: { connection: { host: 'reader.example.com' } },
  },
  settings: { migrations: { dir: 'migrations' } },
};

const noReplicaConfig: DatabaseConfig = {
  connection: { ...baseConnection },
  settings: { migrations: { dir: 'migrations' } },
};

describe('Database read/write routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  describe('writer-model registry', () => {
    it('registers models and reports them', () => {
      const db = new Database(withReplicaConfig);
      db.routing.registerWriterModels(['admin::user', 'admin::session']);
      expect(db.isWriterModel('admin::user')).toBe(true);
      expect(db.isWriterModel('admin::session')).toBe(true);
      expect(db.isWriterModel('api::article.article')).toBe(false);
    });
  });

  describe('readConnection wiring', () => {
    it('creates a read connection when a replica is configured', () => {
      const db = new Database(withReplicaConfig);
      expect(db.readConnection).toBe(mockReader);
    });

    it('has no read connection when no replica is configured', () => {
      const db = new Database(noReplicaConfig);
      expect(db.readConnection).toBeUndefined();
    });

    it('destroys both connections on destroy', async () => {
      const db = new Database(withReplicaConfig);
      await db.destroy();
      expect(mockWriter.destroy).toHaveBeenCalledTimes(1);
      expect(mockReader.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConnection pool selection', () => {
    let db: Database;

    beforeEach(() => {
      db = new Database(withReplicaConfig);
    });

    it('defaults to the writer (no intent given)', () => {
      expect(db.getConnection()).toBe(mockWriter);
    });

    it('routes writes to the writer even inside a clean scope', async () => {
      await routingCtx.run(() => {
        expect(db.getConnection(undefined, { intent: 'write' })).toBe(mockWriter);
      });
    });

    it('routes reads to the writer when there is no scope (safe default)', () => {
      expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockWriter);
    });

    it('routes reads to the reader inside a clean scope', async () => {
      await routingCtx.run(() => {
        expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockReader);
      });
    });

    it('routes reads to the writer once the scope is dirty', async () => {
      await routingCtx.run(() => {
        routingCtx.markDirty();
        expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockWriter);
      });
    });

    it('honours a forced writer even for a read in a clean scope', async () => {
      await routingCtx.run(() => {
        expect(db.getConnection(undefined, { intent: 'read', writer: true })).toBe(mockWriter);
      });
    });

    it('honours a forced replica even for a read outside a scope', () => {
      expect(db.getConnection(undefined, { intent: 'read', replica: true })).toBe(mockReader);
    });

    it('honours a forced replica even in a dirty scope', async () => {
      await routingCtx.run(() => {
        routingCtx.markDirty();
        expect(db.getConnection(undefined, { intent: 'read', replica: true })).toBe(mockReader);
      });
    });

    it('always uses the writer inside a transaction, even for a forced replica read', async () => {
      await transactionCtx.run({} as any, async () => {
        await routingCtx.run(() => {
          expect(db.getConnection(undefined, { intent: 'read', replica: true })).toBe(mockWriter);
        });
      });
    });

    it('marks the routing scope dirty when a transaction runs (post-commit reads use the writer)', async () => {
      await routingCtx.run(async () => {
        // clean scope reads the replica
        expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockReader);
        await db.transaction(async () => 'done');
        // a transaction implies a write -> scope is now dirty -> writer
        expect(routingCtx.isDirty()).toBe(true);
        expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockWriter);
      });
    });

    it('exposes a routing scope (db.routing.run) that enables replica reads', async () => {
      await db.routing.run(() => {
        expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockReader);
      });
      // scope closed again -> back to writer
      expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockWriter);
    });

    it('routes reads to the writer inside a withWriterOnly scope', async () => {
      await db.routing.run(async () => {
        expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockReader);
        await db.routing.withWriterOnly(() => {
          expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockWriter);
          // writer-only wins even over a forced replica
          expect(db.getConnection(undefined, { intent: 'read', replica: true })).toBe(mockWriter);
        });
        expect(db.getConnection(undefined, { intent: 'read' })).toBe(mockReader);
      });
    });

    it('never routes to a reader when no replica is configured', async () => {
      const dbNoReplica = new Database(noReplicaConfig);
      await routingCtx.run(() => {
        expect(dbNoReplica.getConnection(undefined, { intent: 'read', replica: true })).toBe(
          mockWriter
        );
      });
    });
  });
});
