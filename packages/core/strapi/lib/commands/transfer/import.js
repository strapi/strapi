'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const _ = require('lodash/fp');

const strapi = require('../../Strapi');

const logger = console;

module.exports = async (filename, opts) => {
  // validate inputs from Commander
  if (!_.isString(filename) || !_.isObject(opts)) {
    logger.error('Could not parse arguments');
    process.exit(1);
  }

  /**
   * From strapi backup file
   */

  // treat any unknown arguments as filenames
  const sourceOptions = {
    backupFilePath: filename,
  };
  const source = createLocalFileSourceProvider(sourceOptions);

  /**
   * To local Strapi instance
   */
  const destinationOptions = {
    getStrapi() {
      return strapi().load();
    },
  };
  const destination = createLocalStrapiDestinationProvider(destinationOptions);

  /**
   * Configure and run the transfer engine
   */
  const engineOptions = {
    strategy: opts.conflictStrategy,
    versionMatching: opts.schemaComparison,
    exclude: opts.exclude,
  };
  const engine = createTransferEngine(source, destination, engineOptions);

  try {
    logger.log('Importing data...');
    const result = await engine.transfer();
    logger.log('Import process has been completed successfully!');

    // TODO: this won't dump the entire results, we will print a pretty summary
    logger.log('Results:', result);
    process.exit(0);
  } catch (e) {
    logger.log('Import process failed unexpectedly');
    process.exit(1);
  }
};
