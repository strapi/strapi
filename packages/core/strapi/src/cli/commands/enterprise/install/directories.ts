import path from 'path';

/** The app folder and each of its parents, up to the root of the file system. */
export const listAncestorDirectories = (appDir: string): string[] => {
  const directories: string[] = [];
  let directory = path.resolve(appDir);

  for (;;) {
    directories.push(directory);

    const parentDirectory = path.dirname(directory);

    if (parentDirectory === directory) {
      return directories;
    }

    directory = parentDirectory;
  }
};
