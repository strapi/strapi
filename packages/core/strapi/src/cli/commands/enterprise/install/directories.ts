import path from 'path';

/** The app folder and each of its parents, up to the root of the file system. */
export const listAncestorDirectories = (appDir: string): string[] => {
  let directory = path.resolve(appDir);
  const directories = [directory];

  // `path.dirname` of the root is the root itself, which ends the walk.
  while (path.dirname(directory) !== directory) {
    directory = path.dirname(directory);
    directories.push(directory);
  }

  return directories;
};
