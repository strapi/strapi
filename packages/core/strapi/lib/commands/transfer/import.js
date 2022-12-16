'use strict';

const {
  createLocalFileSourceProvider,
  createLocalStrapiDestinationProvider,
  createTransferEngine,
  DEFAULT_VERSION_STRATEGY,
  DEFAULT_SCHEMA_STRATEGY,
  DEFAULT_CONFLICT_STRATEGY,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const { isObject } = require('lodash/fp');
const path = require('path');

const strapi = require('../../index');
const { buildTransferTable, DEFAULT_IGNORED_CONTENT_TYPES } = require('./utils');

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

  const destinationOptions = {
    async getStrapi() {
      return strapiInstance;
    },
    strategy: opts.conflictStrategy || DEFAULT_CONFLICT_STRATEGY,
    restore: {
      entities: { exclude: DEFAULT_IGNORED_CONTENT_TYPES },
    },
  };
  const destination = createLocalStrapiDestinationProvider(destinationOptions);

  /**
   * Configure and run the transfer engine
   */
  const engineOptions = {
    versionStrategy: opts.versionStrategy || DEFAULT_VERSION_STRATEGY,
    schemaStrategy: opts.schemaStrategy || DEFAULT_SCHEMA_STRATEGY,
    exclude: opts.exclude,
    rules: {
      entities: [
        {
          filter: (entity) => !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type),
        },
      ],
    },
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
    logger.error('Import process failed unexpectedly:');
    logger.error(e);
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
