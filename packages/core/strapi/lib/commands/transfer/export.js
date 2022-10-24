'use strict';

const {
  createLocalFileDestinationProvider,
  createLocalStrapiSourceProvider,
  createTransferEngine,
  // TODO: we need to solve this issue with typescript modules
  // eslint-disable-next-line import/no-unresolved, node/no-missing-require
} = require('@strapi/data-transfer');
const inquirer = require('inquirer');
const strapi = require('../../Strapi');

const getDefaultExportBackupName = () => `strapi-backup`;

const logger = console;

module.exports = async (args) => {
  // From strapi
  const inputOptions = {
    getStrapi() {
      return strapi().load();
    },
  };
  const source = createLocalStrapiSourceProvider(inputOptions);

  // To file
  if (args.encrypt) {
    if (!args.key) {
      try {
        const answers = await inquirer.prompt([
          {
            type: 'password',
            message: 'Please enter an encryption key',
            name: 'key',
            validate(key) {
              if (key.length > 1) return true;

              return 'Key must be present when using the encrypt option';
            },
          },
        ]);
        Object.assign(args, { key: answers.key });
      } catch (e) {
        throw new Error('Error reading encryption key');
      }
    }
    if (!args.key) {
      throw new Error('Key must be present when using the encrypt option');
    }
  }

  const outputOptions = {
    file: {
      path: args.output || getDefaultExportBackupName(),
    },
    encryption: {
      enabled: args.encrypt,
      key: args.key,
    },
    compression: {
      enabled: args.compress,
    },
  };

  const destination = createLocalFileDestinationProvider(outputOptions);

  // create transfer engine
  const engine = createTransferEngine(source, destination, {
    strategy: 'restore',
    versionMatching: 'minor',
  });

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
