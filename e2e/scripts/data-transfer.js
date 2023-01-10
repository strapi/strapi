import { engine, file, strapi } from '@strapi/data-transfer';
import { resolve } from 'path';

/**
 * @type {(filePath: string) => Promise<void>}
 */
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
    url: 'ws://localhost:1337/admin/transfer',
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
