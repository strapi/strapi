import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { cli as cloudCli, services as cloudServices } from '@strapi/cloud-cli';
import parseToChalk from './utils/parse-to-chalk';

interface CloudError {
  response: {
    status: number;
    data: string | object;
  };
}

function assertCloudError(e: unknown): asserts e is CloudError {
  if ((e as CloudError).response === undefined) {
    throw Error('Expected CloudError');
  }
}

// Save cloud user info to a temporary file for the admin to use during first admin creation
function saveCloudUserInfoToTempFile(email: string): void {
  try {
    // Define the paths
    const strapiTmpDir = '.strapi';
    const cloudUserInfoFile = 'cloud-user-info.json';

    // Ensure .strapi directory exists
    console.log('Cloud Debug saveCloudUserInfoToTempFile strapiTmpDir', strapiTmpDir);
    const exists = fs.existsSync(strapiTmpDir);
    console.log('Cloud Debug saveCloudUserInfoToTempFile exists', exists);
    if (!exists) {
      try {
        console.log('Cloud Debug saveCloudUserInfoToTempFile mkdirSync', strapiTmpDir);
        fs.mkdirSync(strapiTmpDir);
      } catch (error) {
        // Ignore errors if directory already exists or cannot be created
        return;
      }
    }

    const filePath = path.join(strapiTmpDir, cloudUserInfoFile);

    // Save user info to file
    console.log('Cloud Debug saveCloudUserInfoToTempFile filePath', filePath);
    console.log('Cloud Debug saveCloudUserInfoToTempFile email', email);
    fs.writeFileSync(filePath, JSON.stringify({ email }), 'utf8');
  } catch (error) {
    // Silent fail, this is just a convenience feature
  }
}

export async function handleCloudLogin(): Promise<void> {
  const logger = cloudServices.createLogger({
    silent: false,
    debug: process.argv.includes('--debug'),
    timestamp: false,
  });
  const cloudApiService = await cloudServices.cloudApiFactory({ logger });
  const defaultErrorMessage =
    'An error occurred while trying to interact with Strapi Cloud. Use strapi deploy command once the project is generated.';

  try {
    const { data: config } = await cloudApiService.config();
    logger.log(parseToChalk(config.projectCreation.introText));
  } catch (e: unknown) {
    logger.debug(e);
    logger.error(defaultErrorMessage);
    return;
  }
  const { userChoice } = await inquirer.prompt<{ userChoice: string }>([
    {
      type: 'list',
      name: 'userChoice',
      message: `Please log in or sign up.`,
      choices: ['Login/Sign up', 'Skip'],
    },
  ]);

  if (userChoice !== 'Skip') {
    const cliContext = {
      logger,
      cwd: process.cwd(),
    };

    try {
      const loginSuccessful = await cloudCli.login.action(cliContext);

      // If login was successful, try to get and save the user email
      if (loginSuccessful) {
        try {
          // Get token and user info from API
          const { getValidToken } = await cloudServices.tokenServiceFactory(cliContext);
          const token = await getValidToken(cliContext, async () => false);
          console.log('Cloud Debug saveCloudUserInfoToTempFile token', token);

          if (token) {
            const api = await cloudServices.cloudApiFactory(cliContext, token);
            const userInfoResponse = await api.getUserInfo();
            const email = userInfoResponse?.data?.data?.email;

            console.log('Cloud Debug saveCloudUserInfoToTempFile email', email);
            if (email) {
              // Save user email to temp file for the admin to use
              saveCloudUserInfoToTempFile(email);
            }
          }
        } catch (error) {
          // Silent fail, this is just a convenience feature
          logger.debug('Failed to save cloud user info to temp file', error);
        }
      }
    } catch (e: Error | CloudError | unknown) {
      logger.debug(e);
      try {
        assertCloudError(e);
        if (e.response.status === 403) {
          const message =
            typeof e.response.data === 'string'
              ? e.response.data
              : 'We are sorry, but we are not able to log you into Strapi Cloud at the moment.';
          logger.warn(message);
          return;
        }
      } catch (e) {
        /* empty */
      }
      logger.error(defaultErrorMessage);
    }
  }
}
