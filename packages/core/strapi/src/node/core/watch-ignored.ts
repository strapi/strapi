import path from 'node:path';

const DOT_PATH_REGEX = /(^|[/\\])\../;
const TMP_PATH_REGEX = /tmp/;

/**
 * Creates a chokidar `ignored` matcher for dot files, dot directories and "tmp" paths.
 *
 * The match runs on the path relative to the app directory. Thus an app located under a dot
 * directory (e.g. `~/.config/my-app`) or under a "tmp" directory (e.g. `/tmp/my-app`) is still watched.
 */
const createAppRelativeIgnore = (appDir: string) => (filePath: string) => {
  const relativePath = path.relative(appDir, filePath);

  return DOT_PATH_REGEX.test(relativePath) === true || TMP_PATH_REGEX.test(relativePath) === true;
};

export { createAppRelativeIgnore };
