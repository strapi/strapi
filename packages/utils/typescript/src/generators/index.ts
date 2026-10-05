import path from 'node:path';
import fs from 'node:fs/promises';
import chalk from 'chalk';

import { TYPES_ROOT_DIR, GENERATED_OUT_DIR } from './constants';
import { saveDefinitionToFileSystem, createLogger, timer, pathExists } from './utils';
import { generateContentTypesDefinitions } from './content-types';
import { generateComponentsDefinitions } from './components';
import { generatePluginDefinitions } from './plugins';
import { generateServicesDefinitions } from './services';
import { generateStrictDefinitions } from './strict';

const GENERATORS = {
  contentTypes: generateContentTypesDefinitions,
  components: generateComponentsDefinitions,
  plugins: generatePluginDefinitions,
  services: generateServicesDefinitions,
  strict: generateStrictDefinitions,
};

export interface GenerateConfig {
  strapi: any;
  pwd: string;
  rootDir?: string;
  /**
   * Artifacts to generate. `true` generates the artifact, `false` removes the file a previous
   * run may have generated for it, unset leaves it untouched.
   */
  artifacts?: {
    contentTypes?: boolean;
    components?: boolean;
    plugins?: boolean;
    services?: boolean;
    strict?: boolean;
    controllers?: boolean;
    policies?: boolean;
    middlewares?: boolean;
  };
  logger?: {
    silent?: boolean;
    debug?: boolean;
    verbose?: boolean;
  };
}

/**
 * Generate types definitions based on the given configuration
 */
export const generate = async (config: GenerateConfig = {} as GenerateConfig) => {
  const { pwd, rootDir = TYPES_ROOT_DIR, strapi, artifacts = {}, logger: loggerConfig } = config;
  const reports: Record<string, any> = {};
  const logger = createLogger(loggerConfig);
  const psTimer = timer().start();

  const registryPwd = path.join(pwd, rootDir, GENERATED_OUT_DIR);
  // Strict mode reads only the global schema registries, so schemas use that form with the opt-in.
  const strict = artifacts.strict === true;
  const generatorConfig = { strapi, pwd: registryPwd, appDir: pwd, logger, strict };

  const returnWithMessage = () => {
    const nbWarnings = chalk.yellow(`${logger.warnings} warning(s)`);
    const nbErrors = chalk.red(`${logger.errors} error(s)`);

    const status = logger.errors > 0 ? chalk.red('errored') : chalk.green('completed successfully');

    psTimer.end();

    logger.info(`The task ${status} with ${nbWarnings} and ${nbErrors} in ${psTimer.duration}s.`);

    return reports;
  };

  const enabledArtifacts = Object.keys(artifacts).filter(
    (p) => (artifacts as Record<string, boolean>)[p] === true
  );
  const disabledArtifacts = Object.keys(artifacts).filter(
    (p) => (artifacts as Record<string, boolean>)[p] === false && p in GENERATORS
  );

  logger.info('Starting the type generation process');
  logger.debug(`Enabled artifacts: ${enabledArtifacts.join(', ')}`);

  for (const artifact of enabledArtifacts) {
    const boldArtifact = chalk.bold(artifact); // used for log messages

    logger.info(`Generating types for ${boldArtifact}`);

    if (artifact in GENERATORS) {
      const generator = (GENERATORS as any)[artifact];

      try {
        const artifactGenTimer = timer().start();

        reports[artifact] = await generator(generatorConfig);

        artifactGenTimer.end();

        logger.debug(`Generated ${boldArtifact} in ${artifactGenTimer.duration}s`);
      } catch (e) {
        logger.error(
          `Failed to generate types for ${boldArtifact}: ${(e as any).message ?? (e as any).toString()}. Exiting`
        );
        return returnWithMessage();
      }
    } else {
      logger.warn(`The types generator for ${boldArtifact} is not implemented, skipping`);
    }
  }

  for (const artifact of Object.keys(reports)) {
    const boldArtifact = chalk.bold(artifact); // used for log messages

    const artifactFsTimer = timer().start();

    const report = reports[artifact];
    const filename = `${artifact}.d.ts`;

    try {
      const outPath = await saveDefinitionToFileSystem(registryPwd, filename, report.output);
      const relativeOutPath = path.relative(process.cwd(), outPath);

      artifactFsTimer.end();

      logger.info(`Saved ${boldArtifact} types in ${chalk.bold(relativeOutPath)}`);
      logger.debug(`Saved ${boldArtifact} in ${artifactFsTimer.duration}s`);
    } catch (e) {
      logger.error(
        `An error occurred while saving ${boldArtifact} types to the filesystem: ${
          (e as any).message ?? (e as any).toString()
        }. Exiting`
      );
      return returnWithMessage();
    }
  }

  // Disabled artifacts are removed so that a stale generated file does not keep applying
  for (const artifact of disabledArtifacts) {
    const boldArtifact = chalk.bold(artifact); // used for log messages
    const outPath = path.join(registryPwd, `${artifact}.d.ts`);

    if ((await pathExists(outPath)) === false) {
      continue;
    }

    try {
      await fs.rm(outPath);

      logger.info(
        `Removed ${boldArtifact} types from ${chalk.bold(path.relative(process.cwd(), outPath))} (artifact disabled)`
      );
    } catch (e) {
      logger.error(
        `An error occurred while removing ${boldArtifact} types from the filesystem: ${
          (e as any).message ?? (e as any).toString()
        }. Exiting`
      );
      return returnWithMessage();
    }
  }

  return returnWithMessage();
};
