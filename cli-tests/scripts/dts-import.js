import { resolve } from 'path';
import { CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } from '../constants';

const {
  file: {
    providers: { createLocalFileSourceProvider },
  },
  strapi: {
    providers: { createRemoteStrapiDestinationProvider },
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');

/**
 * Reset the DB and import data from a DTS dataset
 */
export const resetDatabaseAndImportDataFromPath = async (filePath) => {
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
  createLocalFileSourceProvider({
    file: { path: resolve(filePath) },
    encryption: { enabled: false },
    compression: { enabled: false },
  });

const createDestinationProvider = () => {
  return createRemoteStrapiDestinationProvider({
    url: new URL(`http://127.0.0.1:${process.env.PORT ?? 1337}/admin`),
    auth: { type: 'token', token: CUSTOM_TRANSFER_TOKEN_ACCESS_KEY },
    strategy: 'restore',
  });
};
