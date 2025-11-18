import { resolve, join } from 'path';
import { ALLOWED_CONTENT_TYPES, CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } from '../constants';

const {
  file: {
    providers: { createLocalFileSourceProvider },
  },
  strapi: {
    providers: { createRemoteStrapiDestinationProvider },
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');

interface RestoreConfiguration {
  coreStore: boolean;
}

/**
 * Reset the DB and import data from a DTS backup
 * This function ensures we keep all admin user's and roles in the DB
 * see: https://docs.strapi.io/developer-docs/latest/developer-resources/data-management.html
 */
export const resetDatabaseAndImportDataFromPath = async (
  file: string,
  modifiedContentTypesFn: (cts: string[]) => string[] = (cts) => cts,
  configuration: RestoreConfiguration = { coreStore: true }
) => {
  const filePath = resolve(__dirname, '../data/', file);
  const source = createSourceProvider(filePath);
  const includedTypes = modifiedContentTypesFn(ALLOWED_CONTENT_TYPES);
  const destination = createDestinationProvider(includedTypes, configuration);

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore',
    schemaStrategy: 'ignore',
    transforms: {
      links: [
        {
          // only transfer relations to+from requested content types
          filter(link: any) {
            return (
              includedTypes.includes(link.left.type) &&
              (includedTypes.includes(link.right.type) || link.right.type === undefined)
            );
          },
        },
      ],
      entities: [
        {
          // only include entities of requested content types
          filter(entity: any) {
            return includedTypes.includes(entity.type);
          },
        },
      ],
    },
  });

  engine.diagnostics.onDiagnostic((diagnostic: any) => {
    if (diagnostic.kind !== 'info') console.log(diagnostic);
  });

  try {
    // reset the transfer token to allow the transfer if it's been wiped (that is, not included in previous import data)
    await fetch(`http://127.0.0.1:${process.env.PORT ?? 1337}/api/config/resettransfertoken`, {
      method: 'POST',
    });
  } catch (err) {
    console.error('Token reset failed.' + JSON.stringify(err, null, 2));
    process.exit(1);
  }

  try {
    await engine.transfer();
  } catch {
    console.error('Import process failed.');
    process.exit(1);
  }
};

const createSourceProvider = (filePath: string) =>
  createLocalFileSourceProvider({
    file: { path: filePath },
    encryption: { enabled: false },
    compression: { enabled: false },
  });

const createDestinationProvider = (
  includedTypes: any[] = [],
  configuration: RestoreConfiguration
) => {
  return createRemoteStrapiDestinationProvider({
    url: new URL(`http://127.0.0.1:${process.env.PORT ?? 1337}/admin`),
    auth: { type: 'token', token: CUSTOM_TRANSFER_TOKEN_ACCESS_KEY },
    strategy: 'restore',
    restore: {
      assets: true,
      entities: {
        include: includedTypes,
      },
      configuration,
    },
  });
};
