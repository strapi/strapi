const { resolve } = require('path');
const {
  file: {
    providers: { createLocalDirectorySourceProvider },
  },
  strapi: {
    providers: { createRemoteStrapiDestinationProvider },
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');
const { CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } = require('../constants');

/**
 * Reset the DB and import data from a DTS dataset
 * This is meant to be used directly from a CLI test
 */
const resetDatabaseAndImportDataFromPath = async (filePath) => {
  const source = createSourceProvider(filePath);
  const destination = createDestinationProvider();

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore',
    schemaStrategy: 'ignore',
  });

  engine.diagnostics.onDiagnostic(console.log);

  try {
    await engine.transfer();
  } catch (e) {
    console.error('Import process failed.');
    console.error(e);
    process.exit(1);
  }
};

const createSourceProvider = (filePath) =>
  createLocalDirectorySourceProvider({
    dir: { path: resolve(filePath) },
  });

const createDestinationProvider = () => {
  // TODO: When possible, use the local strapi destination provider instead
  //       For this we need to wait to have access to a Strapi instance
  return createRemoteStrapiDestinationProvider({
    url: new URL(`http://127.0.0.1:${process.env.PORT ?? 1337}/admin`),
    auth: { type: 'token', token: CUSTOM_TRANSFER_TOKEN_ACCESS_KEY },
    strategy: 'restore',
  });
};

module.exports = { resetDatabaseAndImportDataFromPath };
