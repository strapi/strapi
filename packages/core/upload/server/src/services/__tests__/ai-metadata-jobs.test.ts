import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Database } from '@strapi/database';

import {
  AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS,
  AI_METADATA_JOB_STALE_AFTER_MS,
  createAIMetadataJobsService,
} from '../ai-metadata-jobs';
import { aiMetadataJob } from '../../models/ai-metadata-job';

import type { AIMetadataJob } from '../../../../shared/contracts/ai-metadata-jobs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('AI metadata jobs service', () => {
  let db: Database;
  let tmpDir: string;
  const originalStrapi = global.strapi;
  let service: ReturnType<typeof createAIMetadataJobsService>;
  const log = { warn: jest.fn(), error: jest.fn() };

  /** A job left `processing`, whose server last wrote its heartbeat `ageMs` ago */
  const createProcessingJob = async (ageMs: number | null): Promise<number> => {
    const jobId = await service.createJob();
    await service.updateJob(jobId, {
      heartbeatAtMs: ageMs === null ? null : Date.now() - ageMs,
    });
    return jobId;
  };

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-upload-ai-jobs-'));
    db = new Database({
      connection: {
        client: 'sqlite',
        connection: { filename: path.join(tmpDir, 'data.db') },
        useNullAsDefault: true,
      },
      settings: { migrations: { dir: path.join(tmpDir, 'migrations') } },
      logger: { debug() {}, info() {}, warn() {}, error() {} } as any,
    });

    // The entity manager reaches for the global `strapi.db` to open its relation transaction
    global.strapi = { db } as any;

    await db.init({ models: [aiMetadataJob] });
    await db.schema.sync();

    service = createAIMetadataJobsService({ strapi: { db, log } as any });
  });

  afterAll(async () => {
    await db.destroy();
    // The unit setup defines `strapi` with a setter that rejects `undefined` and `delete`
    global.strapi = originalStrapi ?? ({} as any);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads job dates back as ISO strings, not Date instances', async () => {
    const jobId = await service.createJob();

    const created = await service.getJob(jobId);
    expect(created).not.toBeNull();
    const createdJob = created as AIMetadataJob;

    // Typed as strings: assigning to `string` fails type checking if the contract says `Date`
    const createdAt: string = createdJob.createdAt;
    expect(createdAt).toMatch(ISO_DATE);
    expect(createdJob.completedAt).toBeNull();

    await service.updateJob(jobId, { status: 'completed', completedAt: new Date() });

    const latest = (await service.getLatestActiveJob()) as AIMetadataJob;
    const completedAt: string | null = latest.completedAt;
    expect(latest.status).toBe('completed');
    expect(latest.createdAt).toMatch(ISO_DATE);
    expect(completedAt).toMatch(ISO_DATE);
  });

  it('fails only the jobs still processing, and leaves settled jobs as they are', async () => {
    const completedId = await service.createJob();
    await service.updateJob(completedId, {
      status: 'completed',
      completedAt: new Date(0),
      heartbeatAtMs: 0,
    });
    const failedId = await service.createJob();
    await service.updateJob(failedId, {
      status: 'failed',
      completedAt: new Date(0),
      heartbeatAtMs: 0,
    });
    const processingId = await createProcessingJob(AI_METADATA_JOB_STALE_AFTER_MS + 1_000);

    await service.failInterruptedJobs();

    expect(await service.getJob(completedId)).toMatchObject({
      status: 'completed',
      completedAt: new Date(0).toISOString(),
    });
    expect(await service.getJob(failedId)).toMatchObject({
      status: 'failed',
      completedAt: new Date(0).toISOString(),
    });

    const interrupted = (await service.getJob(processingId)) as AIMetadataJob;
    expect(interrupted.status).toBe('failed');
    expect(interrupted.completedAt).toMatch(ISO_DATE);
  });

  it('leaves alone a processing job whose server still writes its heartbeat', async () => {
    // Another server on the same database runs this job and wrote its heartbeat a moment ago
    const runningId = await createProcessingJob(AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);

    await service.failInterruptedJobs();

    expect(await service.getJob(runningId)).toMatchObject({
      status: 'processing',
      completedAt: null,
    });
  });

  it('fails a processing job created before jobs had a heartbeat', async () => {
    const legacyId = await createProcessingJob(null);

    await service.failInterruptedJobs();

    const legacy = (await service.getJob(legacyId)) as AIMetadataJob;
    expect(legacy.status).toBe('failed');
    expect(legacy.completedAt).toMatch(ISO_DATE);
  });

  it('settles a processing job as completed or failed', async () => {
    const completedId = await service.createJob();
    const failedId = await service.createJob();

    await service.settleJob(completedId, 'completed');
    await service.settleJob(failedId, 'failed');

    const completed = (await service.getJob(completedId)) as AIMetadataJob;
    expect(completed.status).toBe('completed');
    expect(completed.completedAt).toMatch(ISO_DATE);
    expect(await service.getJob(failedId)).toMatchObject({ status: 'failed' });
  });

  it('does not settle a job that was already failed, so the failure the admin saw stays', async () => {
    // A server swept the job as interrupted while it was still running somewhere
    const jobId = await createProcessingJob(AI_METADATA_JOB_STALE_AFTER_MS + 1_000);
    await service.failInterruptedJobs();
    const swept = (await service.getJob(jobId)) as AIMetadataJob;

    await service.settleJob(jobId, 'completed');

    expect(await service.getJob(jobId)).toMatchObject({
      status: 'failed',
      completedAt: swept.completedAt,
    });
  });

  describe('heartbeat', () => {
    beforeEach(() => {
      // Keep the event loop phases real: sqlite and knex rely on them
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const heartbeatOf = async (jobId: number) =>
      Number(((await service.getJob(jobId)) as AIMetadataJob).heartbeatAtMs);

    it('writes the heartbeat of a running job at each interval, and stops when told to', async () => {
      const jobId = await service.createJob();
      const createdHeartbeat = await heartbeatOf(jobId);
      expect(createdHeartbeat).toBe(Date.now());

      service.startHeartbeat(jobId);

      await jest.advanceTimersByTimeAsync(AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);
      const firstBeat = await heartbeatOf(jobId);
      expect(firstBeat).toBe(createdHeartbeat + AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);

      await jest.advanceTimersByTimeAsync(AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);
      const secondBeat = await heartbeatOf(jobId);
      expect(secondBeat).toBe(firstBeat + AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);

      service.stopHeartbeat(jobId);
      await jest.advanceTimersByTimeAsync(AI_METADATA_JOB_STALE_AFTER_MS);

      expect(await heartbeatOf(jobId)).toBe(secondBeat);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('does not write the heartbeat of a job that is no longer processing', async () => {
      const jobId = await service.createJob();
      service.startHeartbeat(jobId);
      await service.updateJob(jobId, { status: 'completed', completedAt: new Date() });
      const settledHeartbeat = await heartbeatOf(jobId);

      await jest.advanceTimersByTimeAsync(AI_METADATA_JOB_HEARTBEAT_INTERVAL_MS);

      expect(await heartbeatOf(jobId)).toBe(settledHeartbeat);
      service.stopHeartbeat(jobId);
    });

    it('lets another server fail a running job only once its server stops writing the heartbeat', async () => {
      // Two servers on the same database: `service` runs the job, `otherServer` sweeps
      const otherServer = createAIMetadataJobsService({ strapi: { db, log } as any });
      const jobId = await service.createJob();
      service.startHeartbeat(jobId);

      // The running server keeps the heartbeat fresh for longer than the stale bound
      await jest.advanceTimersByTimeAsync(AI_METADATA_JOB_STALE_AFTER_MS * 2);
      await otherServer.failInterruptedJobs();
      expect(await service.getJob(jobId)).toMatchObject({ status: 'processing' });

      // The running server crashes: the heartbeat stops, without the job being settled
      service.stopHeartbeat(jobId);
      await jest.advanceTimersByTimeAsync(AI_METADATA_JOB_STALE_AFTER_MS + 1_000);
      await otherServer.failInterruptedJobs();

      expect(await service.getJob(jobId)).toMatchObject({ status: 'failed' });
    });

    it('stores the heartbeat as epoch milliseconds, which no time zone or DST change shifts', async () => {
      // Europe/Paris falls back at 01:00 UTC: 02:00:50 local comes after 02:59:00 local. A
      // timestamp without time zone stores local wall time on Postgres and MySQL, so a heartbeat
      // written then compared as older than the cutoff two minutes earlier.
      jest.setSystemTime(new Date('2026-10-25T01:00:50Z'));
      const jobId = await service.createJob();

      const row = await db
        .getConnection()('strapi_ai_metadata_jobs')
        .where({ id: jobId })
        .first('heartbeat_at_ms');
      expect(Number(row.heartbeat_at_ms)).toBe(Date.parse('2026-10-25T01:00:50Z'));

      jest.setSystemTime(new Date('2026-10-25T01:01:00Z'));
      await service.failInterruptedJobs();

      expect(await service.getJob(jobId)).toMatchObject({ status: 'processing' });
    });

    it('never fails a job this process runs, even when its heartbeat writes stop landing', async () => {
      const jobId = await service.createJob();
      service.startHeartbeat(jobId);
      // A database blip: this process still runs the job, but its last heartbeat looks stale
      await service.updateJob(jobId, {
        heartbeatAtMs: Date.now() - AI_METADATA_JOB_STALE_AFTER_MS * 2,
      });
      // A job left by a server that crashed, as stale as this process's job
      const orphanId = await createProcessingJob(AI_METADATA_JOB_STALE_AFTER_MS * 2);

      await service.failInterruptedJobs();

      expect(await service.getJob(jobId)).toMatchObject({ status: 'processing' });
      expect(await service.getJob(orphanId)).toMatchObject({ status: 'failed' });
      service.stopHeartbeat(jobId);
    });

    it('fails the jobs of this process when it stops, and only those', async () => {
      const ownedId = await service.createJob();
      service.startHeartbeat(ownedId);
      // Another server runs this one, with a heartbeat as fresh as the owned job's
      const otherServerId = await service.createJob();

      await service.failOwnedJobs();

      expect(await service.getJob(ownedId)).toMatchObject({ status: 'failed' });
      expect(await service.getJob(otherServerId)).toMatchObject({ status: 'processing' });
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});

describe('AI metadata jobs table upgrade', () => {
  let tmpDir: string;
  const originalStrapi = global.strapi;

  const openDatabase = async (model: typeof aiMetadataJob) => {
    const db = new Database({
      connection: {
        client: 'sqlite',
        connection: { filename: path.join(tmpDir, 'data.db') },
        useNullAsDefault: true,
      },
      settings: { migrations: { dir: path.join(tmpDir, 'migrations') } },
      logger: { debug() {}, info() {}, warn() {}, error() {} } as any,
    });
    global.strapi = { db } as any;
    await db.init({ models: [model] });
    await db.schema.sync();
    return db;
  };

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-upload-ai-jobs-upgrade-'));
  });

  afterAll(() => {
    global.strapi = originalStrapi ?? ({} as any);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('adds the heartbeat column to an existing table, and fails the jobs it left processing', async () => {
    // The table as it was before jobs had a heartbeat
    const { heartbeatAtMs, ...legacyAttributes } = aiMetadataJob.attributes;
    expect(heartbeatAtMs).toBeDefined();
    const legacyDb = await openDatabase({ ...aiMetadataJob, attributes: legacyAttributes });
    const legacyJob = await legacyDb.query(aiMetadataJob.uid).create({
      data: { status: 'processing', createdAt: new Date() },
    });
    await legacyDb.destroy();

    const db = await openDatabase(aiMetadataJob);
    const service = createAIMetadataJobsService({ strapi: { db } as any });

    expect(await service.getJob(legacyJob.id)).toMatchObject({
      status: 'processing',
      heartbeatAtMs: null,
    });

    await service.failInterruptedJobs();

    expect(await service.getJob(legacyJob.id)).toMatchObject({ status: 'failed' });
    await db.destroy();
  });
});
