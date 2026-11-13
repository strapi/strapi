'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const JOB_UID = 'plugin::upload.ai-metadata-job';
// The bound `failInterruptedJobs` uses, kept here so the test reads in plain numbers
const STALE_AFTER_MS = 2 * 60_000;

let strapi;
let rq;

const jobs = () => strapi.plugin('upload').service('aiMetadataJobs');

/** A job left `processing`, whose server last wrote its heartbeat `ageMs` ago */
const createProcessingJob = async (ageMs) => {
  const jobId = await jobs().createJob();
  await jobs().updateJob(jobId, { heartbeatAtMs: Date.now() - ageMs });
  return jobId;
};

const getLatest = () => rq({ method: 'GET', url: '/upload/ai-metadata-jobs/latest' });

describe('GET /upload/ai-metadata-jobs/latest', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // The route answers 404 unless an AI metadata provider is available, which needs a license
    jest.spyOn(strapi.plugin('upload').service('aiMetadata'), 'isEnabled').mockResolvedValue(true);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await strapi.db.query(JOB_UID).deleteMany({});
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('fails the latest job once the server running it stopped writing its heartbeat', async () => {
    const jobId = await createProcessingJob(STALE_AFTER_MS + 1_000);

    const res = await getLatest();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: jobId, status: 'failed' });
    expect(res.body.completedAt).not.toBeNull();
  });

  test('fails a job created before jobs had a heartbeat', async () => {
    const jobId = await jobs().createJob();
    await jobs().updateJob(jobId, { heartbeatAtMs: null });

    const res = await getLatest();

    expect(res.body).toMatchObject({ id: jobId, status: 'failed' });
  });

  test('leaves the latest job processing while another server writes its heartbeat', async () => {
    const jobId = await createProcessingJob(10_000);

    const res = await getLatest();

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: jobId, status: 'processing', completedAt: null });
  });

  test('leaves a live job processing right after a DST fall-back', async () => {
    // Europe/Paris falls back at 01:00 UTC, so 02:00:50 local comes after 02:59:00 local. Postgres
    // and MySQL store a `datetime` as local wall time, so a heartbeat compared as a `datetime`
    // looked older than the cutoff and the live job was failed for two minutes.
    const originalTz = process.env.TZ;
    process.env.TZ = 'Europe/Paris';

    try {
      // Only `Date` is faked; the database driver and the HTTP stack keep their real timers
      jest.useFakeTimers({
        now: new Date('2026-10-25T01:00:50Z'),
        advanceTimers: true,
        doNotFake: [
          'hrtime',
          'nextTick',
          'performance',
          'queueMicrotask',
          'setImmediate',
          'clearImmediate',
          'setInterval',
          'clearInterval',
          'setTimeout',
          'clearTimeout',
        ],
      });
      const jobId = await jobs().createJob();

      jest.setSystemTime(new Date('2026-10-25T01:01:00Z'));
      const res = await getLatest();

      expect(res.body).toMatchObject({ id: jobId, status: 'processing' });
    } finally {
      // Assigning `undefined` would set the string "undefined"
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    }
  });
});
