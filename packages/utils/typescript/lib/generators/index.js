'use strict';

const path = require('path');
const chalk = require('chalk');

const { TYPES_ROOT_DIR, REGISTRIES_OUT_DIR } = require('./constants');
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
 * @property {object} [artefacts]
 * @property {boolean} [artefacts.contentTypes]
 * @property {boolean} [artefacts.components]
 * @property {boolean} [artefacts.services]
 * @property {boolean} [artefacts.controllers]
 * @property {boolean} [artefacts.policies]
 * @property {boolean} [artefacts.middlewares]
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
  const { pwd, rootDir = TYPES_ROOT_DIR, strapi, artefacts = {}, logger: loggerConfig } = config;
  const reports = {};
  const logger = createLogger(loggerConfig);
  const psTimer = timer().start();

  const registryPwd = path.join(pwd, rootDir, REGISTRIES_OUT_DIR);
  const generatorConfig = { strapi, pwd: registryPwd, logger };

  const returnWithMessage = () => {
    const nbWarnings = chalk.yellow(maybePlural('warning', logger.warnings));
    const nbErrors = chalk.red(maybePlural('error', logger.errors));

    const status = logger.errors > 0 ? chalk.red('errored') : chalk.green('completed successfully');

    psTimer.end();

    logger.info(`The task ${status} with ${nbWarnings} and ${nbErrors} in ${psTimer.duration}s.`);

    return reports;
  };

  const enabledArtefacts = Object.keys(artefacts).filter((p) => artefacts[p] === true);

  logger.info('Starting the type generation process');
  logger.debug(`Enabled artefacts: ${enabledArtefacts.join(', ')}`);

  for (const artefact of enabledArtefacts) {
    const boldArtefact = chalk.bold(artefact); // used for log messages

    logger.info(`Generating types for ${boldArtefact}`);

    if (artefact in GENERATORS) {
      const generator = GENERATORS[artefact];

      try {
        const artefactGenTimer = timer().start();

        reports[artefact] = await generator(generatorConfig);

        artefactGenTimer.end();

        logger.debug(`Generated ${boldArtefact} in ${artefactGenTimer.duration}s`);
      } catch (e) {
        logger.error(
          `Failed to generate types for ${boldArtefact}: ${e.message ?? e.toString()}. Exiting`
        );
        return returnWithMessage();
      }
    } else {
      logger.warn(`The types generator for ${boldArtefact} is not implemented, skipping`);
    }
  }

  for (const artefact of Object.keys(reports)) {
    const boldArtefact = chalk.bold(artefact); // used for log messages

    const artefactFsTimer = timer().start();

    const report = reports[artefact];
    const filename = `${artefact}.d.ts`;

    try {
      const outPath = await saveDefinitionToFileSystem(registryPwd, filename, report.output);
      const relativeOutPath = path.relative(__dirname, outPath);

      artefactFsTimer.end();

      logger.info(`Saved ${boldArtefact} types in ${chalk.bold(relativeOutPath)}`);
      logger.debug(`Saved ${boldArtefact} in ${artefactFsTimer.duration}s`);
    } catch (e) {
      logger.error(
        `An error occurred while saving ${boldArtefact} types to the filesystem: ${
          e.message ?? e.toString()
        }. Exiting`
      );
      return returnWithMessage();
    }
  }

  return returnWithMessage();
};

const maybePlural = (word, n) => `${n} ${word}${n > 1 ? 's' : ''}`;

module.exports = { generate };
