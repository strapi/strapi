'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const { isObject } = require('lodash/fp');
const path = require('path');

const strapi = require('../../index');
const { buildTransferTable } = require('./utils');

/**
 * @typedef {import('@strapi/data-transfer').ILocalFileSourceProviderOptions} ILocalFileSourceProviderOptions
 */

const logger = console;

module.exports = async (opts) => {
  // validate inputs from Commander
  if (!isObject(opts)) {
    logger.error('Could not parse arguments');
    process.exit(1);
  }

  /**
   * From strapi backup file
   */
  const sourceOptions = getLocalFileSourceOptions(opts);

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

/**
 * Infer local file source provider options based on a given filename
 *
 * @param {{ file: string; key?: string }} opts
 *
 * @return {ILocalFileSourceProviderOptions}
 */
const getLocalFileSourceOptions = (opts) => {
  /**
   * @type {ILocalFileSourceProviderOptions}
   */
  const options = {
    file: { path: opts.file },
    compression: { enabled: false },
    encryption: { enabled: false },
  };

  const { extname, parse } = path;

  let file = options.file.path;

  if (extname(file) === '.enc') {
    file = parse(file).name;
    options.encryption = { enabled: true, key: opts.key };
  }

  if (extname(file) === '.gz') {
    file = parse(file).name;
    options.compression = { enabled: true };
  }

  return options;
};
