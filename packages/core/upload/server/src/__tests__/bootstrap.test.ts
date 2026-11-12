import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'path';

import { Database } from '@strapi/database';

import { bootstrap } from '../bootstrap';
import { aiMetadataJob } from '../models/ai-metadata-job';
import { createAIMetadataJobsService } from '../services/ai-metadata-jobs';

jest.mock('@strapi/provider-upload-local', () => ({
  init() {
    return {
      uploadStream: jest.fn(),
      upload: jest.fn(),
      delete: jest.fn(),
    };
  },
}));

const createStrapiMock = ({
  setStore = jest.fn(() => {}),
  registerMany = jest.fn(() => {}),
  isAvailable = false,
  isStrapiManagedAiEnabled = false,
  hasProvider = jest.fn(() => false),
  registerStrapiManagedProvider = jest.fn(),
  auditLogsLifecycle = undefined as { registerEvent: jest.Mock } | undefined,
  aiMetadataJobs = { failInterruptedJobs: jest.fn() } as Partial<
    ReturnType<typeof createAIMetadataJobsService>
  >,
  httpServer = new EventEmitter(),
} = {}) =>
  ({
    server: { httpServer },
    has: jest.fn((name: string) => name === 'audit-logs-lifecycle' && !!auditLogsLifecycle),
    get(name: string) {
      switch (name) {
        case 'webhookStore':
          return {
            addAllowedEvent: jest.fn(),
          };
        case 'audit-logs-lifecycle':
          return auditLogsLifecycle;
        default:
          return null;
      }
    },
    dirs: {
      dist: { root: process.cwd() },
      app: { root: process.cwd() },
      static: { public: join(process.cwd(), 'public') },
    },
    admin: {
      services: { permission: { actionProvider: { registerMany } } },
    },
    ai: {
      admin: {
        isEnabled: () => false,
        isAvailable: () => isAvailable,
        isStrapiManagedAiEnabled: () => isStrapiManagedAiEnabled,
      },
    },
    log: {
      error() {},
    },
    config: {
      get: jest.fn().mockReturnValueOnce({ provider: 'local' }),
      paths: {},
      info: {
        dependencies: {},
      },
    },
    plugins: {
      upload: {
        services: {
          metrics: {
            sendUploadPluginMetrics() {},
          },
          weeklyMetrics: {
            registerCron() {},
          },
          extensions: {
            signFileUrlsOnDocumentService: jest.fn(),
          },
          aiMetadataProvider: {
            hasProvider,
            registerStrapiManagedProvider,
          },
          aiMetadataJobs,
        },
      },
    },
    plugin() {
      return {};
    },
    service: () => ({
      registerErrorMiddleware: jest.fn(),
    }),
    store() {
      return {
        get() {
          return null;
        },
        set: setStore,
      };
    },
  }) as any;

describe('Upload plugin bootstrap function', () => {
  test('Sets default config if it does not exist', async () => {
    const setStore = jest.fn(() => {});

    global.strapi = createStrapiMock({ setStore });

    await bootstrap({ strapi });

    expect(setStore).toHaveBeenCalledWith({
      value: {
        aiMetadata: true,
        autoOrientation: false,
        sizeOptimization: true,
        responsiveDimensions: true,
      },
    });
  });

  test('registers the Strapi-managed AI metadata provider', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: true,
      isStrapiManagedAiEnabled: true,
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).toHaveBeenCalledTimes(1);
  });

  test('does not register the Strapi-managed provider when AI is not available', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: false,
      isStrapiManagedAiEnabled: true,
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).not.toHaveBeenCalled();
  });

  test('does not register the Strapi-managed provider without the cms-ai feature', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: true,
      isStrapiManagedAiEnabled: false,
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).not.toHaveBeenCalled();
  });

  test('leaves a custom provider in place', async () => {
    const registerStrapiManagedProvider = jest.fn();

    global.strapi = createStrapiMock({
      isAvailable: true,
      isStrapiManagedAiEnabled: true,
      hasProvider: jest.fn(() => true),
      registerStrapiManagedProvider,
    });

    await bootstrap({ strapi });

    expect(registerStrapiManagedProvider).not.toHaveBeenCalled();
  });

  test('registers the audit log events when audit logs are available', async () => {
    const auditLogsLifecycle = { registerEvent: jest.fn() };

    global.strapi = createStrapiMock({ auditLogsLifecycle });

    await bootstrap({ strapi });

    expect(auditLogsLifecycle.registerEvent.mock.calls.map(([name]) => name)).toEqual([
      'upload-settings.update',
      'media.create',
      'media.update.audit',
      'media.delete',
      'media-folder.create',
      'media-folder.update',
      'media-folder.delete.audit',
      'media.move',
    ]);
  });

  describe('AI metadata jobs left by a previous process', () => {
    let db: Database;
    let tmpDir: string;
    let jobs: ReturnType<typeof createAIMetadataJobsService>;

    beforeAll(async () => {
      tmpDir = fs.mkdtempSync(join(os.tmpdir(), 'strapi-upload-bootstrap-'));
      db = new Database({
        connection: {
          client: 'sqlite',
          connection: { filename: join(tmpDir, 'data.db') },
          useNullAsDefault: true,
        },
        settings: { migrations: { dir: join(tmpDir, 'migrations') } },
        logger: { debug() {}, info() {}, warn() {}, error() {} } as any,
      });

      await db.init({ models: [aiMetadataJob] });
      await db.schema.sync();

      jobs = createAIMetadataJobsService({ strapi: { db } as any });
    });

    afterAll(async () => {
      await db.destroy();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('leaves a processing job alone when the app is only loaded, as CLI commands do', async () => {
      // `strapi export`, `strapi console` and the like run `load()` but never listen. A server
      // may be running this job right now, so the CLI process must not touch it.
      global.strapi = { ...createStrapiMock({ aiMetadataJobs: jobs }), db };

      const jobId = await jobs.createJob();

      await bootstrap({ strapi });

      expect(await jobs.getJob(jobId)).toMatchObject({ status: 'processing', completedAt: null });
    });

    test('fails a job left processing by a previous server once this server listens', async () => {
      const httpServer = new EventEmitter();
      const failInterruptedJobs = jest.spyOn(jobs, 'failInterruptedJobs');
      // The entity manager reaches for the global `strapi.db` to open its transactions
      global.strapi = { ...createStrapiMock({ aiMetadataJobs: jobs, httpServer }), db };

      // The previous server created the job, then stopped before `processExistingFiles` settled it
      const jobId = await jobs.createJob();

      await bootstrap({ strapi });
      expect(failInterruptedJobs).not.toHaveBeenCalled();

      httpServer.emit('listening');
      await failInterruptedJobs.mock.results[0]?.value;

      // Without this, `/latest` keeps answering `processing` and the settings page polls forever
      const latest = await jobs.getLatestActiveJob();
      expect(latest).toMatchObject({ id: jobId, status: 'failed' });
      expect(latest?.completedAt).not.toBeNull();

      failInterruptedJobs.mockRestore();
    });
  });
});
