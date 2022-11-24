'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');

const strapi = require('../../index');

const logger = console;

module.exports = async (opts) => {
  const filename = opts.file;

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
    async getStrapi() {
      return strapi(await strapi.compile()).load();
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
    logger.log(`Import process failed unexpectedly: ${e.message}`);
    process.exit(1);
  }
};
