'use strict';

const {
  createRemoteStrapiDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  createLocalStrapiDestinationProvider,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const { isObject } = require('lodash/fp');
const chalk = require('chalk');

const {
  buildTransferTable,
  createStrapiInstance,
  DEFAULT_IGNORED_CONTENT_TYPES,
} = require('./utils');

const logger = console;

/**
 * @typedef ImportCommandOptions Options given to the CLI import command
 *
 * @property {string} [to] The destination provider to use ("local" or the url of a remote Strapi)
 * @property {string} [from] The source provider to use ("local" or the url of a remote Strapi)
 */

/**
 * Import command.
 *
 * It transfers data from a local file to a local strapi instance
 *
 * @param {ImportCommandOptions} opts
 */
module.exports = async (opts) => {
  // Validate inputs from Commander
  if (!isObject(opts)) {
    logger.error('Could not parse command arguments');
    process.exit(1);
  }

  const strapi = await createStrapiInstance();

  let source;
  let destination;

  if (opts.from === 'local') {
    source = createLocalStrapiSourceProvider({
      getStrapi: () => strapi,
    });
  } else {
    logger.error(`Cannot transfer from provider '${opts.from}'`);
    process.exit(1);
  }

  if (opts.to === 'local') {
    if (opts.from === 'local') {
      logger.error('Source and destination cannot both be local Strapi instances.');
      process.exit(1);
    }

    destination = createLocalStrapiDestinationProvider({
      getStrapi: () => strapi,
    });
  } else if (opts.to) {
    destination = createRemoteStrapiDestinationProvider({
      url: opts.to,
      auth: false,
      strategy: 'restore',
      restore: {
        entities: { exclude: DEFAULT_IGNORED_CONTENT_TYPES },
      },
    });
  } else {
    logger.error(`Cannot transfer from provider '${opts.from}'`);
    process.exit(1);
  }

  if (!source || !destination) {
    logger.error('Could not create providers');
    process.exit(1);
  }

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore', // for an export to file, versionStrategy will always be skipped
    schemaStrategy: 'ignore', // for an export to file, schemaStrategy will always be skipped
    transforms: {
      links: [
        {
          filter(link) {
            return (
              !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.left.type) &&
              !DEFAULT_IGNORED_CONTENT_TYPES.includes(link.right.type)
            );
          },
        },
      ],
      entities: [
        {
          filter(entity) {
            return !DEFAULT_IGNORED_CONTENT_TYPES.includes(entity.type);
          },
        },
      ],
    },
  });

  try {
    logger.log(`Starting transfer...`);

    const results = await engine.transfer();

    const table = buildTransferTable(results.engine);
    logger.log(table.toString());

    logger.log(`${chalk.bold('Transfer process has been completed successfully!')}`);
    process.exit(0);
  } catch (e) {
    logger.error('Transfer process failed unexpectedly:', e);
    process.exit(1);
  }
};
