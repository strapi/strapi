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
const { buildTransferTable } = require('./utils');

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
    file: { path: filename },
    compression: { enabled: opts.decompress },
    encryption: { enabled: opts.decrypt, key: opts.key },
  };

  console.log(JSON.stringify(sourceOptions, null, 2));

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
    logger.info('Starting import...');

    const results = await engine.transfer();
    const table = buildTransferTable(results.engine);
    logger.info(table.toString());

    logger.info('Import process has been completed successfully!');
    process.exit(0);
  } catch (e) {
    logger.error(`Import process failed unexpectedly: ${e.message}`);
    process.exit(1);
  }
};
