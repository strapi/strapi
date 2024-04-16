'use strict';

const {
  file: {
    providers: { createLocalFileDestinationProvider },
  },
  strapi: {
    providers: { createLocalStrapiSourceProvider },
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');
const { createStrapi } = require('@strapi/strapi');
const { ALLOWED_CONTENT_TYPES } = require('../constants');

/**
 * Export the data from a strapi project.
 * This script should be run as `node <path-to>/dts-export.js [exportFilePath]` from the
 * root directory of a strapi project e.g. `/examples/kitchensink`. Remember to import
 * the `with-admin` tar file into the project first because the tests rely on the data.
 */
const exportData = async () => {
  let args = process.argv.slice(2);

  if (args.length !== 1) {
    console.error('Please provide the export file name as a parameter.');
    process.exit(1);
  }

  const strapi = await createStrapiInstance();

  const source = createSourceProvider(strapi);
  const destination = createDestinationProvider(args[0]);

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore', // for an export to file, versionStrategy will always be skipped
    schemaStrategy: 'ignore', // for an export to file, schemaStrategy will always be skipped
    transforms: {
      links: [
        {
          filter(link) {
            return (
              ALLOWED_CONTENT_TYPES.includes(link.left.type) &&
              ALLOWED_CONTENT_TYPES.includes(link.right.type)
            );
          },
        },
      ],
      entities: [
        {
          filter(entity) {
            return ALLOWED_CONTENT_TYPES.includes(entity.type);
          },
        },
      ],
    },
  });

  engine.diagnostics.onDiagnostic(console.log);

  try {
    const results = await engine.transfer();

    console.log(JSON.stringify(results.engine, null, 2));
  } catch {
    console.error('Export process failed.');
    process.exit(1);
  }

  process.exit(0);
};

const createSourceProvider = (strapi) =>
  createLocalStrapiSourceProvider({
    async getStrapi() {
      return strapi;
    },
  });

const createDestinationProvider = (filePath) =>
  createLocalFileDestinationProvider({
    file: { path: filePath },
    encryption: { enabled: false },
    compression: { enabled: false },
  });

const createStrapiInstance = async (logLevel = 'error') => {
  const app = createStrapi();

  app.log.level = logLevel;
  const loadedApp = await app.load();

  return loadedApp;
};

module.exports = {
  exportData,
};
