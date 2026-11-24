import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'path';

import { Database } from '@strapi/database';

import { bootstrap } from '../bootstrap';
import { aiMetadataJob } from '../models/ai-metadata-job';
import {
  AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS,
  AI_METADATA_JOB_STALE_AFTER_MS,
  createAIMetadataJobsService,
} from '../services/ai-metadata-jobs';

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

      jobs = createAIMetadataJobsService({ strapi: { db, log: console } as any });
    });

    /** Boots this server against the shared database, and resolves once its sweep ran */
    const bootAndListen = async () => {
      const httpServer = new EventEmitter();
      const failInterruptedJobs = jest.spyOn(jobs, 'failInterruptedJobs');
      // The entity manager reaches for the global `strapi.db` to open its transactions
      global.strapi = { ...createStrapiMock({ aiMetadataJobs: jobs, httpServer }), db };

      await bootstrap({ strapi });
      httpServer.emit('listening');
      await failInterruptedJobs.mock.results[0]?.value;

      failInterruptedJobs.mockRestore();
    };

    /** A job left `processing`, whose server last wrote its heartbeat `ageMs` ago */
    const createProcessingJob = async (ageMs: number) => {
      const jobId = await jobs.createJob();
      await jobs.updateJob(jobId, { heartbeatAtMs: Date.now() - ageMs });
      return jobId;
    };

    afterAll(async () => {
      await db.destroy();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('leaves a processing job alone when the app is only loaded, as CLI commands do', async () => {
      // `strapi export`, `strapi import` and the like run `load()` but never listen. A process
      // that does not serve HTTP never fails a job, even one whose heartbeat looks stale.
      global.strapi = { ...createStrapiMock({ aiMetadataJobs: jobs }), db };

      const jobId = await createProcessingJob(AI_METADATA_JOB_STALE_AFTER_MS + 1_000);

      await bootstrap({ strapi });

      expect(await jobs.getJob(jobId)).toMatchObject({ status: 'processing', completedAt: null });
    });

    test('fails a job left processing by a previous server once this server listens', async () => {
      const httpServer = new EventEmitter();
      const failInterruptedJobs = jest.spyOn(jobs, 'failInterruptedJobs');
      // The entity manager reaches for the global `strapi.db` to open its transactions
      global.strapi = { ...createStrapiMock({ aiMetadataJobs: jobs, httpServer }), db };

      // The previous server created the job, then stopped before `processExistingFiles` settled it,
      // so its heartbeat is stale
      const jobId = await createProcessingJob(AI_METADATA_JOB_STALE_AFTER_MS + 1_000);

      await bootstrap({ strapi });
      expect(failInterruptedJobs).not.toHaveBeenCalled();

      httpServer.emit('listening');
      await failInterruptedJobs.mock.results[0]?.value;

      // Without this, `/latest` keeps answering `processing` and the settings page polls forever
      const job = await jobs.getJob(jobId);
      expect(job).toMatchObject({ id: jobId, status: 'failed' });
      expect(job?.completedAt).not.toBeNull();

      failInterruptedJobs.mockRestore();
    });

    test('leaves alone a job that another server still runs when this server listens', async () => {
      // Server A, on the same database, runs this job and wrote its heartbeat a moment ago. This
      // server is B restarting, or a `strapi console` started on another host or port.
      const jobId = await createProcessingJob(AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);

      await bootAndListen();

      expect(await jobs.getJob(jobId)).toMatchObject({ status: 'processing', completedAt: null });
    });

    test('fails a job created before jobs had a heartbeat once this server listens', async () => {
      const jobId = await jobs.createJob();
      await jobs.updateJob(jobId, { heartbeatAtMs: null });

      await bootAndListen();

      expect(await jobs.getJob(jobId)).toMatchObject({ status: 'failed' });
    });
  });
});
