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

// Check if the directory of a given filePath (which can be either posix or win32) resolves to the same as the given posix-format path posixDirName
export const isDirPathEquivalent = (posixDirName: string, filePath: string) => {
  // if win32 convert to posix, then get dirname
  const normalizedDir = path.posix.dirname(filePath.split(path.win32.sep).join(path.posix.sep));
  return isPathEquivalent(posixDirName, normalizedDir);
};

// Check if two paths that can be either in posix or win32 format resolves to the same file
export const isPathEquivalent = (fileA: string, fileB: string) => {
  // Check if paths appear to be win32 or posix, and if win32 convert to posix
  const normalizedPathA = fileA.split(path.win32.sep).join(path.posix.sep);
  const normalizedPathB = fileB.split(path.win32.sep).join(path.posix.sep);

  return !path.posix.relative(normalizedPathB, normalizedPathA).length;
};
