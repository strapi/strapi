import { resolve } from 'path';
import { ALLOWED_CONTENT_TYPES, CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } from '../e2e/constants';

const {
  file: {
    providers: { createLocalFileSourceProvider },
  },
  strapi: {
    providers: { createRemoteStrapiDestinationProvider, createLocalStrapiDestinationProvider },
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
 *
 * This version requires a running Strapi server (for e2e tests)
 */
export const resetDatabaseAndImportDataFromPath = async (
  file: string,
  modifiedContentTypesFn: (cts: string[]) => string[] = (cts) => cts,
  configuration: RestoreConfiguration = { coreStore: true }
) => {
  // If file is already an absolute path, use it; otherwise resolve relative to e2e/data
  const filePath =
    file.startsWith('/') || file.includes('\\') ? file : resolve(__dirname, '../e2e/data/', file);
  const source = createSourceProvider(filePath);
  const includedTypes = modifiedContentTypesFn(ALLOWED_CONTENT_TYPES);
  const destination = createRemoteDestinationProvider(includedTypes, configuration);

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

/**
 * Reset the DB and import data from a DTS backup programmatically
 * This version works with a loaded Strapi instance (no HTTP server required)
 * Use this for CLI tests where Strapi is loaded but not running as a server
 * The function handles loading and destroying the Strapi instance internally
 *
 * @param appPath - Path to the Strapi app directory
 * @param file - Path to the DTS backup file (relative to tests/e2e/data or absolute)
 * @param modifiedContentTypesFn - Optional function to modify content types
 * @param configuration - Restore configuration
 */
export const resetDatabaseAndImportDataFromPathProgrammatic = async (
  appPath: string,
  file: string,
  modifiedContentTypesFn: (cts: string[]) => string[] = (cts) => cts,
  configuration: RestoreConfiguration = { coreStore: true }
) => {
  // Load environment variables from the test app's .env file
  const { loadTestAppEnv } = require('./helpers');
  await loadTestAppEnv(appPath);

  // Load Strapi instance
  const { createStrapi } = require('@strapi/core');
  const strapiInstance = createStrapi({
    appDir: appPath,
    distDir: appPath,
  });
  await strapiInstance.load();

  try {
    // If file is already an absolute path, use it; otherwise resolve relative to e2e/data
    const filePath =
      file.startsWith('/') || file.includes('\\') ? file : resolve(__dirname, '../e2e/data/', file);
    const source = createSourceProvider(filePath);
    const includedTypes = modifiedContentTypesFn(ALLOWED_CONTENT_TYPES);
    const destination = createLocalDestinationProvider(
      strapiInstance,
      includedTypes,
      configuration
    );

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

    await engine.transfer();
  } catch (err) {
    console.error('Import process failed:', err);
    throw err;
  } finally {
    await strapiInstance.destroy();
  }
};

// Script execution: only run if this file is executed directly (not imported)
const importData = async () => {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('Please provide the name of the file you want to import from tests/e2e/data');
    process.exit(1);
  }

  await resetDatabaseAndImportDataFromPath(filePath);
  console.log('Data transfer succeeded');
  process.exit(0);
};

const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.env.JEST_WORKER_ID !== undefined ||
  typeof jest !== 'undefined';

const isDirectExecution =
  !isTestEnvironment &&
  typeof require.main !== 'undefined' &&
  require.main === module &&
  process.argv.length > 2 &&
  process.argv[2];

if (isDirectExecution) {
  importData();
}

const createSourceProvider = (filePath: string) =>
  createLocalFileSourceProvider({
    file: { path: filePath },
    encryption: { enabled: false },
    compression: { enabled: false },
  });

const createRemoteDestinationProvider = (
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

const createLocalDestinationProvider = (
  strapiInstance: any,
  includedTypes: any[] = [],
  configuration: RestoreConfiguration
) => {
  return createLocalStrapiDestinationProvider({
    async getStrapi() {
      return strapiInstance;
    },
    autoDestroy: false,
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
