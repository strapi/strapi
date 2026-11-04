import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { Database } from '@strapi/database';

import { createAIMetadataJobsService } from '../ai-metadata-jobs';
import { aiMetadataJob } from '../../models/ai-metadata-job';

import type { AIMetadataJob } from '../../../../shared/contracts/ai-metadata-jobs';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('AI metadata jobs service', () => {
  let db: Database;
  let tmpDir: string;
  const originalStrapi = global.strapi;
  let service: ReturnType<typeof createAIMetadataJobsService>;

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

    service = createAIMetadataJobsService({ strapi: { db } as any });
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
});
