import path from 'node:path';
import fp from 'lodash/fp';

/**
 * Returns a path (as an array) from a file path
 */
export const filePathToPropPath = (
  entryPath: string,
  useFileNameAsKey: boolean = true
): string[] => {
  const transform = fp.pipe(
    // Remove the relative path prefixes: './' for posix (and some win32) and ".\" for win32
    removeRelativePrefix,
    // Remove the path metadata and extensions
    fp.replace(/(\.settings|\.json|\.js)/g, ''),
    // Transform to lowercase
    // Note: We're using fp.toLower instead of fp.lowercase as the latest removes special characters such as "/"
    fp.toLower,
    // Split the cleaned path by matching every possible separator (either "/" or "\" depending on the OS)
    fp.split(new RegExp(`[\\${path.win32.sep}|${path.posix.sep}]`, 'g')),
    // Make sure to remove leading '.' from the different path parts
    fp.map(fp.trimCharsStart('.')),
    // join + split in case some '.' characters are still present in different parts of the path
    fp.join('.'),
    fp.split('.'),
    // Remove the last portion of the path array if the file name shouldn't be used as a key
    useFileNameAsKey ? fp.identity : fp.slice(0, -1)
  );

  return transform(entryPath) as string[];
};

const removeRelativePrefix = (filePath: string) => {
  return filePath.startsWith(`.${path.win32.sep}`) || filePath.startsWith(`.${path.posix.sep}`)
    ? filePath.slice(2)
    : filePath;
};
