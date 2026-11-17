import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { baseEnv, strapiBin } from './config';
import type { App } from './generate';

export const adminIndexFile = (app: App) => path.join(app.dir, 'build', 'index.html');

export const hasAdminBuild = (app: App) => fs.existsSync(adminIndexFile(app));

export interface BuildAdminOptions {
  /**
   * Env baked into the bundle (`STRAPI_ADMIN_*`, feature flags, edition). Build in each job
   * with that job's env, and never cache or share `build/` across jobs.
   */
  env?: NodeJS.ProcessEnv;
}

/**
 * Build the admin panel once per run. Servers then start with `--no-build-admin`.
 */
export const buildAdmin = async (app: App, { env }: BuildAdminOptions = {}) => {
  const output: string[] = [];

  const code = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(process.execPath, [strapiBin(), 'build'], {
      cwd: app.dir,
      env: { ...process.env, ...baseEnv(), ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => output.push(chunk.toString()));
    child.stderr.on('data', (chunk) => output.push(chunk.toString()));
    child.on('error', reject);
    child.on('exit', resolve);
  });

  if (code !== 0 || !hasAdminBuild(app)) {
    throw new Error(
      `Admin build of ${app.name} failed (exit ${code}, ${adminIndexFile(app)} ${
        hasAdminBuild(app) ? 'present' : 'missing'
      }):\n${output.join('').slice(-4000)}`
    );
  }
};
