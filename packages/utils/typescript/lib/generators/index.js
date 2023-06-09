'use strict';

const path = require('path');
const chalk = require('chalk');

const { TYPES_ROOT_DIR, GENERATED_OUT_DIR } = require('./constants');
const { saveDefinitionToFileSystem, createLogger, timer } = require('./utils');
const generateContentTypesDefinitions = require('./content-types');
const generateComponentsDefinitions = require('./components');

const GENERATORS = {
  contentTypes: generateContentTypesDefinitions,
  components: generateComponentsDefinitions,
};

/**
 * @typedef GenerateConfig
 *
 * @property {object} strapi
 * @property {boolean} pwd
 * @property {object} [artifacts]
 * @property {boolean} [artifacts.contentTypes]
 * @property {boolean} [artifacts.components]
 * @property {boolean} [artifacts.services]
 * @property {boolean} [artifacts.controllers]
 * @property {boolean} [artifacts.policies]
 * @property {boolean} [artifacts.middlewares]
 * @property {object} [logger]
 * @property {boolean} [logger.silent]
 * @property {boolean} [logger.debug]
 * @property {boolean} [logger.verbose]
 */

/**
 * Generate types definitions based on the given configuration
 *
 * @param {GenerateConfig} [config]
 */
const generate = async (config = {}) => {
  const { pwd, rootDir = TYPES_ROOT_DIR, strapi, artifacts = {}, logger: loggerConfig } = config;
  const reports = {};
  const logger = createLogger(loggerConfig);
  const psTimer = timer().start();

  const registryPwd = path.join(pwd, rootDir, GENERATED_OUT_DIR);
  const generatorConfig = { strapi, pwd: registryPwd, logger };

  const returnWithMessage = () => {
    const nbWarnings = chalk.yellow(`${logger.warnings} warning(s)`);
    const nbErrors = chalk.red(`${logger.errors} error(s)`);

    const status = logger.errors > 0 ? chalk.red('errored') : chalk.green('completed successfully');

    psTimer.end();

    logger.info(`The task ${status} with ${nbWarnings} and ${nbErrors} in ${psTimer.duration}s.`);

    return reports;
  };

  const enabledArtifacts = Object.keys(artifacts).filter((p) => artifacts[p] === true);

  logger.info('Starting the type generation process');
  logger.debug(`Enabled artifacts: ${enabledArtifacts.join(', ')}`);

  for (const artifact of enabledArtifacts) {
    const boldArtifact = chalk.bold(artifact); // used for log messages

    logger.info(`Generating types for ${boldArtifact}`);

    if (artifact in GENERATORS) {
      const generator = GENERATORS[artifact];

      try {
        const artifactGenTimer = timer().start();

        reports[artifact] = await generator(generatorConfig);

        artifactGenTimer.end();

        logger.debug(`Generated ${boldArtifact} in ${artifactGenTimer.duration}s`);
      } catch (e) {
        logger.error(
          `Failed to generate types for ${boldArtifact}: ${e.message ?? e.toString()}. Exiting`
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
      const relativeOutPath = path.relative(__dirname, outPath);

      artifactFsTimer.end();

      logger.info(`Saved ${boldArtifact} types in ${chalk.bold(relativeOutPath)}`);
      logger.debug(`Saved ${boldArtifact} in ${artifactFsTimer.duration}s`);
    } catch (e) {
      logger.error(
        `An error occurred while saving ${boldArtifact} types to the filesystem: ${
          e.message ?? e.toString()
        }. Exiting`
      );
      return returnWithMessage();
    }
  }

  return returnWithMessage();
};

module.exports = { generate };
