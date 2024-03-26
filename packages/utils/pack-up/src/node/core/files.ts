import { readdir, lstat, access, mkdir } from 'fs/promises';

/**
 * @internal
 */
const isEmptyDirectory = async (dir: string) => {
  const files = await readdir(dir);

  return files.length === 0;
};

/**
 * @internal
 */
const isDirectory = async (dir: string) => {
  const stats = await lstat(dir);

  return stats.isDirectory();
};

/**
 * @internal
 */
const pathExists = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * @internal
 *
 * @description Ensures that the path is viable for a package to be created at
 * by checking if it exists, if not creating it and if it does exist ensuring it's
 * an empty directory. It will fail if any of these conditions are not met.
 */
const ensurePackagePathIsViable = async (path: string) => {
  const exists = await pathExists(path);

  if (!exists) {
    await mkdir(path, { recursive: true });
  }

  const isEmpty = await isEmptyDirectory(path);

  if (!isEmpty) {
    throw new Error(`${path} is not empty`);
  }

  const isDir = await isDirectory(path);

  if (!isDir) {
    throw new Error(`${path} is not a directory`);
  }
};

export { ensurePackagePathIsViable, pathExists };
