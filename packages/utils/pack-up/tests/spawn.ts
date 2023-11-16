/* eslint-disable no-console */
import child_process from 'child_process';
import { mkdir, readdir, stat as fsStat, copyFile } from 'fs/promises';
import path from 'path';

import { stripColor } from './console';
import { createWorkspace } from './workspaces';

const copyDirectory = async (source: string, destination: string): Promise<void> => {
  await mkdir(destination, { recursive: true });

  const files = await readdir(source);

  for (const file of files) {
    const currentPath = path.join(source, file);
    const destinationPath = path.join(destination, file);

    const stat = await fsStat(currentPath);

    if (stat.isDirectory()) {
      await copyDirectory(currentPath, destinationPath);
    } else {
      await copyFile(currentPath, destinationPath);
    }
  }
};

const exec = (
  command: string,
  options: child_process.ExecOptions = {}
): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    child_process.exec(command, options, (err, stdout, stderr) => {
      if (err) {
        const execErr = new ExecError(err.message, stdout, stderr);

        execErr.stack = err.stack;
        reject(execErr);

        return;
      }

      resolve({ stdout: stripColor(stdout), stderr: stripColor(stderr) });
    });
  });
};

export class ExecError extends Error {
  stdout: string;

  stderr: string;

  constructor(message: string, stdout: string, stderr: string) {
    super(message);
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

const runExec = (cwd: string) => async (cmd: string) => {
  try {
    const env = {
      ...process.env,
      PATH: `${process.env.PATH}:${path.resolve(__dirname, '../../bin')}`,
    };

    const res = await exec(cmd, { cwd, env });

    return res;
  } catch (execErr) {
    if (execErr instanceof ExecError) {
      console.log(execErr.stdout);
      console.error(execErr.stderr);

      return execErr;
    }

    throw execErr;
  }
};

interface Project {
  cwd: string;
  install: () => Promise<{ stdout: string; stderr: string }>;
  remove: () => Promise<void>;
  run: (cmd: string) => Promise<{ stdout: string; stderr: string }>;
}

const spawn = async (projectName: string): Promise<Project> => {
  const { path: tmpPath, remove: tmpRemove } = await createWorkspace();

  const packagePath = path.resolve(__dirname, '..', 'examples', projectName);

  /**
   * Clone the project into the tmp space
   */
  await copyDirectory(packagePath, tmpPath);

  const execute = runExec(tmpPath);

  return {
    cwd: tmpPath,
    install: () => execute('yarn install'),
    remove: tmpRemove,
    run: (cmd: string) => execute(`yarn run ${cmd}`),
  };
};

export { spawn };
