'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const _ = require('lodash/fp');

const strapi = require('../../Strapi');

const getDefaultExportBackupName = () => `strapi-backup`;

const logger = console;

const BYTES_IN_MB = 1024 * 1024;

module.exports = async (filename, opts) => {
  // validate inputs from Commander
  if (!_.isObject(opts)) {
    logger.error('Could not parse arguments');
    process.exit(1);
  }
  /**
   * From local Strapi instance
   */
  const sourceOptions = {
    getStrapi() {
      return strapi().load();
    },
  };
  const source = createLocalStrapiSourceProvider(sourceOptions);

  /**
   * To a Strapi backup file
   */
  // treat any unknown arguments as filenames
  const destinationOptions = {
    file: {
      path: _.isString(filename) && filename.length > 0 ? filename : getDefaultExportBackupName(),
      maxSize: _.isFinite(opts.maxSize) ? Math.floor(opts.maxSize) * BYTES_IN_MB : undefined,
      maxSizeJsonl: _.isFinite(opts.maxSizeJsonl)
        ? Math.floor(opts.maxSizeJsonl) * BYTES_IN_MB
        : undefined,
    },
    encryption: {
      enabled: opts.encrypt,
      key: opts.key,
    },
    compression: {
      enabled: opts.compress,
    },
    archive: {
      enabled: opts.archive,
    },
  };
  const destination = createLocalFileDestinationProvider(destinationOptions);

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
    const result = await engine.transfer();
    if (!result?.destination?.path) throw new Error('Export file not created');
    logger.log(
      'Export process has been completed successfully! Export archive is in %s',
      result.destination.path
    );
    process.exit(0);
  } catch (e) {
    logger.error('Export process failed unexpectedly:', e.toString());
    process.exit(1);
  }
};
