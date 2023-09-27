import { randomUUID } from 'crypto';
import { mkdir, rm } from 'fs/promises';
import path from 'path';

/**
 * Remove all the tmp folder and everything in it.
 * Great for when it all goes wrong.
 */
const cleanupWorkspaces = async () => {
  const workspacePath = path.resolve(__dirname, `__tmp__`);

  return rm(workspacePath, { recursive: true, force: true });
};

const createWorkspace = async () => {
  const key = randomUUID();

  const workspacePath = path.resolve(__dirname, '__tmp__', key);

  await mkdir(workspacePath, { recursive: true });

  return {
    path: workspacePath,
    remove: () => rm(workspacePath, { recursive: true, force: true }),
  };
};

export { cleanupWorkspaces, createWorkspace };
