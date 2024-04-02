import { resolve, join } from 'path';
import { ALLOWED_CONTENT_TYPES, CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } from '../constants';
import execa from 'execa';

const {
  file: {
    providers: { createLocalFileSourceProvider },
  },
  strapi: {
    providers: { createRemoteStrapiDestinationProvider },
  },
  engine: { createTransferEngine },
} = require('@strapi/data-transfer');

function delay(seconds) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function pollHealthCheck(interval = 1000, timeout = 30000) {
  const url = `http://127.0.0.1:${process.env.PORT ?? 1337}/_health`;
  console.log(`Starting to poll: ${url}`);

  let elapsed = 0;

  while (elapsed < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        console.log('The service is up and running!');
        return; // Exit if the service is up
      }
      // If the response is not okay, throw an error to catch it below
      throw new Error('Service not ready');
    } catch (error) {
      console.log('Waiting for the service to come up...');
      // Wait for the specified interval before trying again
      await new Promise((resolve) => setTimeout(resolve, interval));
      elapsed += interval; // Update the elapsed time
    }
  }

  // If we've exited the loop because of the timeout
  console.error('Timeout reached, service did not become available in time.');
}

const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

export const resetFiles = async () => {
  if (process.env.TEST_APP_PATH) {
    console.log('Restoring filesystem');
    await execa('git', [...gitUser, 'reset', '--hard'], {
      stdio: 'inherit',
      cwd: process.env.TEST_APP_PATH,
    });
    const dryRun = await execa('git', [...gitUser, 'clean', '-fd'], {
      stdio: 'inherit',
      cwd: process.env.TEST_APP_PATH,
    });
  }

  // wait for server to restart after modifying files
  console.log('Waiting for Strapi to restart...');
  // TODO: this is both a waste of time and flaky. We need to find a way to access playwright server output and watch for the "up" log to appear
  await delay(3); // give it time to detect file changes and begin its restart
  await pollHealthCheck(); // give it time to come back up
};

/**
 * Reset the DB and import data from a DTS backup
 * This function ensures we keep all admin user's and roles in the DB
 * see: https://docs.strapi.io/developer-docs/latest/developer-resources/data-management.html
 * @param {String} filePath the path to a DTS backup
 */
export const resetDatabaseAndImportDataFromPath = async (file) => {
  const filePath = join('./tests/e2e/data/', file);
  const source = createSourceProvider(filePath);
  const destination = createDestinationProvider();

  const engine = createTransferEngine(source, destination, {
    versionStrategy: 'ignore',
    schemaStrategy: 'ignore',
    only: ['content', 'files'],
    transforms: {
      links: [
        {
          filter(link) {
            return (
              ALLOWED_CONTENT_TYPES.includes(link.left.type) &&
              (ALLOWED_CONTENT_TYPES.includes(link.right.type) || link.right.type === undefined)
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
    // reset the transfer token to allow the transfer if it's been wiped (that is, not included in previous import data)
    const res = await fetch(
      `http://127.0.0.1:${process.env.PORT ?? 1337}/api/config/resettransfertoken`,
      {
        method: 'POST',
      }
    );
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
    restore: {
      assets: true,
      entities: {
        include: ALLOWED_CONTENT_TYPES,
      },
      configuration: {
        coreStore: false,
        webhook: false,
      },
    },
  });
};
