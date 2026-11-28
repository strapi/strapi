import path from 'node:path';

/**
 * Nexus only accepts absolute paths for its artifact outputs. A relative path from the plugin
 * config is resolved against the app root, so it does not depend on where the config file is
 * compiled to (dist/config in a TypeScript project). Other values are returned unchanged.
 */
export const resolveArtifactPath = <T>(value: T, appRoot: string): T | string => {
  if (typeof value === 'string' && !path.isAbsolute(value)) {
    return path.resolve(appRoot, value);
  }

  return value;
};
