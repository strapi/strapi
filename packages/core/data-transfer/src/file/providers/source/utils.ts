import path from 'path';

/**
 * Note: in versions of the transfer engine <=4.9.0, exports were generated with windows paths
 * on Windows systems, and posix paths on posix systems.
 *
 * We now store all paths as posix, but need to leave a separator conversion for legacy purposes, and to
 * support manually-created tar files coming from Windows systems (ie, if a user creates a
 * backup file with a windows tar tool rather than using the `export` command)
 *
 * Because of this, export/import files may never contain files with a forward slash in the name, even escaped
 *
 * */

/**
 * Check if the directory of a given filePath (which can be either posix or win32) resolves to the same as the given posix-format path posixDirName
 * We must be able to assume the first argument is a path to a directory and the second is a path to a file, otherwise path.dirname will interpret a path without any slashes as the filename
 *
 * @param {string} posixDirName A posix path pointing to a directory
 * @param {string} filePath an unknown filesystem path pointing to a file
 * @returns {boolean} is the file located in the given directory
 */
export const isFilePathInDirname = (posixDirName: string, filePath: string) => {
  const normalizedDir = path.posix.dirname(unknownPathToPosix(filePath));
  return isPathEquivalent(posixDirName, normalizedDir);
};

/**
 *  Check if two paths that can be either in posix or win32 format resolves to the same file
 *
 * @param {string} pathA a path that may be either win32 or posix
 * @param {string} pathB a path that may be either win32 or posix
 *
 * @returns {boolean} do paths point to the same place
 */
export const isPathEquivalent = (pathA: string, pathB: string) => {
  // Check if paths appear to be win32 or posix, and if win32 convert to posix
  const normalizedPathA = path.posix.normalize(unknownPathToPosix(pathA));
  const normalizedPathB = path.posix.normalize(unknownPathToPosix(pathB));

  return !path.posix.relative(normalizedPathB, normalizedPathA).length;
};

/**
 *  Convert an unknown format path (win32 or posix) to a posix path
 *
 * @param {string} filePath a path that may be either win32 or posix
 *
 * @returns {string} a posix path
 */
export const unknownPathToPosix = (filePath: string) => {
  // if it includes a forward slash, it must be posix already -- we will not support win32 with mixed path separators
  if (filePath.includes(path.posix.sep)) {
    return filePath;
  }

  return path.normalize(filePath).split(path.win32.sep).join(path.posix.sep);
};
