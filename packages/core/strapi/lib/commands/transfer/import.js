'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const { isObject } = require('lodash/fp');
const strapi = require('../../index');

const logger = console;

module.exports = async (opts) => {
  // validate inputs from Commander
  if (!isObject(opts)) {
    logger.error('Could not parse arguments');
    process.exit(1);
  }
  const filename = opts.file;

  /**
   * From strapi backup file
   */
  const sourceOptions = {
    backupFilePath: filename,
  };
  const source = createLocalFileSourceProvider(sourceOptions);

  /**
   * To local Strapi instance
   */
  const strapiInstance = await strapi(await strapi.compile()).load();

  const exceptions = [
    'admin::permission',
    'admin::user',
    'admin::role',
    'admin::api-token',
    'admin::api-token-permission',
  ];
  const contentTypes = Object.values(strapiInstance.contentTypes);
  const contentTypesToDelete = contentTypes.filter(
    (contentType) => !exceptions.includes(contentType.uid)
  );
  const destinationOptions = {
    async getStrapi() {
      return strapiInstance;
    },
    strategy: opts.conflictStrategy,
    restore: {
      contentTypes: contentTypesToDelete,
      uidsOfModelsToDelete: ['webhook', 'strapi::core-store'],
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
