import execa from 'execa';
import semver from 'semver';

const installArguments = ['install'];

type VersionedArgumentsMap = {
  [key: string]: string[]; // Maps semver ranges to argument arrays
};

type VersionedEnvMap = {
  [key: string]: Record<string, string>; // Maps semver ranges to environment variables
};

// Set command line options for specific package managers, with full semver ranges
const installArgumentsMap: {
  [key: string]: VersionedArgumentsMap;
} = {
  npm: {
    '*': ['--legacy-peer-deps'],
  },
  yarn: {
    '<4': ['--network-timeout', '1000000'],
    '*': [],
  },
  pnpm: {
    '*': [],
  },
};

// Set environment variables for specific package managers, with full semver ranges
const installEnvMap: {
  [key: string]: VersionedEnvMap;
} = {
  yarn: {
    '>=4': { YARN_HTTP_TIMEOUT: '1000000' },
    '*': {},
  },
  npm: {
    '*': {},
  },
  pnpm: {
    '*': {},
  },
};

/**
 * Retrieves the version of the specified package manager.
 *
 * Executes the package manager's `--version` command to determine its version.
 *
 * @param packageManager - The name of the package manager (e.g., 'npm', 'yarn', 'pnpm').
 * @param options - Optional execution options to pass to `execa`.
 * @returns A promise that resolves to the trimmed version string of the package manager.
 *
 * @throws Will throw an error if the package manager's version cannot be determined.
 */
export const getPackageManagerVersion = async (
  packageManager: string,
  options?: execa.Options
): Promise<string> => {
  try {
    const { stdout } = await execa(packageManager, ['--version'], options);
    return stdout.trim();
  } catch (err) {
    throw new Error(`Error detecting ${packageManager} version: ${err}`);
  }
};

/**
 * Merges all matching semver ranges using a custom merge function.
 *
 * Iterates over the `versionMap`, checking if the provided `version` satisfies each semver range.
 * If it does, the corresponding value is merged using the provided `mergeFn`.
 * The merging starts with the value associated with the wildcard '*' key.
 *
 * @param version - The package manager version to check against the ranges.
 * @param versionMap - A map of semver ranges to corresponding values (arguments or environment variables).
 * @param mergeFn - A function that defines how to merge two values (accumulated and current).
 * @returns The merged result of all matching ranges.
 */
function mergeMatchingVersionRanges<T>(
  version: string,
  versionMap: { [key: string]: T },
  mergeFn: (acc: T, curr: T) => T
): T {
  return Object.keys(versionMap).reduce((acc, range) => {
    if (semver.satisfies(version, range) || range === '*') {
      return mergeFn(acc, versionMap[range]);
    }
    return acc;
  }, versionMap['*']); // Start with the wildcard entry
}

function mergeArguments(acc: string[], curr: string[]): string[] {
  return [...acc, ...curr];
}

function mergeEnvVars(
  acc: Record<string, string>,
  curr: Record<string, string>
): Record<string, string> {
  return { ...acc, ...curr };
}

/**
 * Retrieves the install arguments and environment variables for a given package manager.
 *
 * This function determines the correct command line arguments and environment variables
 * based on the package manager's version. It uses predefined semver ranges to match
 * the package manager's version and merges all applicable settings.
 *
 * The arguments and environment variables are sourced from:
 *  - `installArgumentsMap` for command line arguments.
 *  - `installEnvMap` for environment variables.
 *
 * The function ensures that all matching semver ranges are considered and merged appropriately.
 * It always includes the base `installArguments` (e.g., `['install']`) and applies any additional
 * arguments or environment variables as defined by the matched version ranges.
 *
 * @param packageManager - The name of the package manager (e.g., 'npm', 'yarn', 'pnpm').
 * @param options - Optional execution options to pass to `execa`.
 * @returns An object containing:
 *  - `cmdArgs`: The full array of install arguments for the given package manager and version.
 *  - `envArgs`: The merged environment variables applicable to the package manager and version.
 *
 * @throws Will throw an error if the package manager version cannot be determined.
 */
export const getInstallArgs = async (packageManager: string, options?: execa.Options) => {
  const packageManagerVersion = await getPackageManagerVersion(packageManager, options);

  // Get environment variables
  const envMap = installEnvMap[packageManager];
  const envArgs = packageManagerVersion
    ? mergeMatchingVersionRanges(packageManagerVersion, envMap, mergeEnvVars)
    : envMap['*'];

  // Get install arguments
  const argsMap = installArgumentsMap[packageManager];
  const cmdArgs = packageManagerVersion
    ? mergeMatchingVersionRanges(packageManagerVersion, argsMap, mergeArguments)
    : argsMap['*'];

  return { envArgs, cmdArgs: [...installArguments, ...cmdArgs], version: packageManagerVersion };
};
