import { spawn } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

import {
  appEnv,
  appPort,
  databaseFromEnv,
  editionFromEnv,
  generateApp,
  resetDatabase,
  strapiBin,
  type App,
  type Database,
} from '@strapi/tests-shared';

/** Vitest worker of this file (1-based), for app names and ports that don't collide. */
export const worker = Number(process.env.VITEST_POOL_ID ?? 1);

export const port = appPort('cli', worker - 1);

export interface RunOptions {
  cwd?: string;
  /** The whole env of the process. Default: the runner's. */
  env?: NodeJS.ProcessEnv;
  /**
   * Written to stdin, which then closes. stdin always closes, so a prompt without an answer
   * reads end-of-file and the CLI fails instead of waiting forever.
   */
  input?: string;
}

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  /** stdout and stderr, for assertions that don't care where a message went. */
  output: string;
}

/** Run a Node CLI in a child process, without a terminal, and wait for it to exit. */
export const run = (
  bin: string,
  args: string[],
  { cwd, env = process.env, input }: RunOptions = {}
) =>
  new Promise<RunResult>((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr, output: `${stdout}${stderr}` });
    });

    child.stdin.end(input);
  });

/**
 * A new app of this worker, on an empty database. `scaffold` writes its content types before
 * anything boots.
 */
export const createApp = async (scaffold?: (app: App) => void) => {
  const database = databaseFromEnv();
  const app = await generateApp({ name: `cli-${worker}` });
  scaffold?.(app);
  await resetDatabase(app, database);
  return { app, database };
};

/**
 * Run the `strapi` CLI in an app, with the env its server gets. The test plugin stays off, so
 * its routes and policy don't show in the output.
 */
export const runStrapi = (
  app: App,
  args: string[],
  { database, env }: { database: Database; env?: NodeJS.ProcessEnv }
) =>
  run(strapiBin(), args, {
    cwd: app.dir,
    env: appEnv(app, {
      database,
      edition: editionFromEnv(),
      testPlugin: false,
      fakeAiProvider: false,
      env,
    }),
  });

/** The rows of a table the CLI prints, keyed by the header cells. */
export const parseTable = (output: string): Array<Record<string, string>> => {
  const [header = [], ...rows] = stripVTControlCharacters(output)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('│') && line.endsWith('│'))
    .map((line) =>
      line
        .slice(1, -1)
        .split('│')
        .map((cell) => cell.trim())
    );

  return rows.map((cells) =>
    header.reduce<Record<string, string>>(
      (row, name, i) => ({ ...row, [name]: cells[i] ?? '' }),
      {}
    )
  );
};
