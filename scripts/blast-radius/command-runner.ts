import { execFile } from 'node:child_process';
import type { CommandRunner } from './types';

export type ExecFileImplementation = typeof execFile;

export const createCommandRunner =
  (execute: ExecFileImplementation = execFile): CommandRunner =>
  async ({ executable, args, cwd, env }) =>
    new Promise((resolve, reject) => {
      execute(
        executable,
        [...args],
        {
          cwd,
          env: { ...process.env, ...env },
          encoding: 'buffer',
          maxBuffer: 16 * 1024 * 1024,
          shell: false,
        },
        (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout: Buffer.from(stdout), stderr: Buffer.from(stderr) });
        }
      );
    });
