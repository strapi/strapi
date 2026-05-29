import os from 'node:os';

import type { Logger } from '../../cli/utils/logger';
import {
  findUndeclaredAdminPeerDeps,
  installAdminPeerDeps,
  MissingAdminPeerDepsError,
  reexecCurrentCommand,
  reportMissingAdminPeerDeps,
  validateDeclaredAdminPeerDeps,
} from './dependencies';

interface EnsureAdminDependenciesOptions {
  cwd: string;
  logger: Logger;
  installIfMissing: boolean;
}

interface EnsureAdminDependenciesResult {
  didInstall: boolean;
}

/**
 * Ensures admin peer dependencies are declared (and optionally auto-installed).
 *
 * Policy (`installIfMissing`) is decided by the caller — e.g. build vs develop CLI flags.
 * Checking and installation are command-agnostic.
 */
const ensureAdminDependencies = async ({
  cwd,
  logger,
  installIfMissing,
}: EnsureAdminDependenciesOptions): Promise<EnsureAdminDependenciesResult> => {
  if (process.env.USE_EXPERIMENTAL_DEPENDENCIES === 'true') {
    logger.warn('You are using experimental dependencies that may not be compatible with Strapi.');
    return { didInstall: false };
  }

  const missing = await findUndeclaredAdminPeerDeps(cwd);

  if (missing.length > 0) {
    if (installIfMissing) {
      logger.info(
        'The Strapi admin needs to install the following dependencies:',
        os.EOL,
        missing.map(({ name, wantedVersion }) => `  - ${name}@${wantedVersion}`).join(os.EOL)
      );

      await installAdminPeerDeps(missing, { cwd, logger });
      await reexecCurrentCommand(cwd);

      return { didInstall: true };
    }

    reportMissingAdminPeerDeps(logger, missing);
    throw new MissingAdminPeerDepsError(missing);
  }

  await validateDeclaredAdminPeerDeps(cwd, logger);

  return { didInstall: false };
};

/**
 * Runs {@link ensureAdminDependencies} and exits the process on failure.
 *
 * @returns `true` when the caller should continue, `false` when a re-exec was triggered.
 */
const handleAdminDependencies = async (
  options: EnsureAdminDependenciesOptions
): Promise<boolean> => {
  try {
    const { didInstall } = await ensureAdminDependencies(options);

    return !didInstall;
  } catch (err) {
    options.logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};

export { ensureAdminDependencies, handleAdminDependencies };
export type { EnsureAdminDependenciesOptions, EnsureAdminDependenciesResult };
