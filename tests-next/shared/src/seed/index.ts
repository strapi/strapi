import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { baseEnv } from '../app/config';
import type { App } from '../app/generate';
import type { Server } from '../app/server';
import { SQLITE, databaseEnv, type Database } from '../db/database';
import { editionEnv, editionFromEnv, type Edition } from '../edition';
import { TEST_PLUGIN_ENV_VAR } from '../test-plugin';
import type { SeedPlan, SeedResult } from './types';

export type { AdminPermission, SeedPlan, SeedResult } from './types';

export interface SeedAppOptions {
  /** The database the server will start on. Default: the app's SQLite file. */
  database?: Database;
  /** Default: the run's edition. Seed with the edition the server will start in. */
  edition?: Edition;
  env?: NodeJS.ProcessEnv;
  /** Default: 120 s. */
  timeout?: number;
}

/**
 * Seed an app before its server starts, in one Node process: Strapi loads once (about 2.5 s,
 * which creates the database and syncs the scaffolded schemas), every step of the plan runs,
 * and Strapi stops. Use it for the data every test of a run or a file starts from; take the
 * snapshot after the server starts and the roles log in.
 *
 * The server must not be running: both would migrate the same database.
 */
export const seedApp = async (
  app: App,
  plan: SeedPlan,
  { database = SQLITE, edition = editionFromEnv(), env, timeout = 120_000 }: SeedAppOptions = {}
): Promise<SeedResult> => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tests-seed-'));
  const planFile = path.join(dir, 'plan.json');
  const resultFile = path.join(dir, 'result.json');

  try {
    fs.writeFileSync(planFile, JSON.stringify(plan));
    await promisify(execFile)(
      process.execPath,
      [path.join(__dirname, 'seed-app.cjs'), app.dir, planFile, resultFile],
      {
        cwd: app.dir,
        env: {
          ...process.env,
          ...baseEnv(),
          ...databaseEnv(app, database),
          ...editionEnv(edition),
          // The seeders live in the test plugin, which refuses to load without it.
          [TEST_PLUGIN_ENV_VAR]: 'true',
          ...env,
        },
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      }
    ).catch((error: Error & { stdout?: string; stderr?: string }) => {
      throw new Error(
        `Seeding ${app.name} failed: ${error.message}\n${error.stdout ?? ''}${error.stderr ?? ''}`
      );
    });
    return JSON.parse(fs.readFileSync(resultFile, 'utf8')) as SeedResult;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Seed a running server, without a restart (POST /api/tests/seed). Use it for the data a single
 * test or file adds on top of the snapshot.
 */
export const seed = async (server: Server, plan: SeedPlan): Promise<SeedResult> => {
  const res = await fetch(`${server.url}/api/tests/seed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(plan),
  });
  const body = await res.text();
  if (!res.ok) {
    let message = body;
    try {
      message = (JSON.parse(body) as { error: { message: string } }).error.message;
    } catch {
      // not a seed error: keep the raw body
    }
    throw new Error(`Seeding ${server.app.name} failed (${res.status}): ${message}`);
  }
  return JSON.parse(body) as SeedResult;
};
