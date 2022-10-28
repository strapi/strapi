import { engine, file, strapi } from '@strapi/data-transfer';
import { resolve } from 'path';

export const resetDatabaseAndImportDataFromPath = async (filePath) => {
  const { createTransferEngine } = engine;
  const {
    providers: { createLocalFileSourceProvider },
  } = file;
  const {
    providers: { createRemoteStrapiDestinationProvider },
  } = strapi;

  const source = createLocalFileSourceProvider({
    file: { path: resolve(filePath) },
    compression: { enabled: false },
    encryption: { enabled: false },
  });

  const destination = createRemoteStrapiDestinationProvider({
    url: new URL('http://localhost:1337/admin'),
    strategy: 'restore',
  });

  const transferEngine = createTransferEngine(source, destination, {
    schemaStrategy: 'ignore',
    versionStrategy: 'ignore',
  });

  try {
    await transferEngine.transfer();
  } catch (e) {
    console.error('error importing data', e);
  }
};
