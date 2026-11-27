import { spawn } from 'node:child_process';

export interface RunOptions {
  cwd?: string;
  /** Added to the env of the runner. */
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
export const run = (bin: string, args: string[], { cwd, env, input }: RunOptions = {}) =>
  new Promise<RunResult>((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], {
      cwd,
      env: { ...process.env, STRAPI_TELEMETRY_DISABLED: 'true', ...env },
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
