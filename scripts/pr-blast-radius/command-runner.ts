import { execFile } from 'node:child_process';
import type { CommandRunner } from './types';
export type ExecFileImplementation = typeof execFile;
export const createCommandRunner =
  (execute: ExecFileImplementation = execFile): CommandRunner =>
  async ({ executable, args, cwd, env }) => {
    const value = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      execute(
        executable,
        [...args],
        {
          cwd,
          env: { ...process.env, ...env },
          encoding: 'utf8',
          maxBuffer: 1048576,
          shell: false,
        },
        (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout: String(stdout), stderr: String(stderr) });
        }
      );
    });
    return value;
  };
