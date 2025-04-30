import inquirer from 'inquirer';
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

export async function handleCloudLogin(): Promise<{ email?: string }> {
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
    return {};
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

      // If login was successful, try to get the user email
      if (loginSuccessful) {
        try {
          // Get token and user info from API
          const { getValidToken } = await cloudServices.tokenServiceFactory(cliContext);
          const token = await getValidToken(cliContext, async () => false);

          if (token) {
            const api = await cloudServices.cloudApiFactory(cliContext, token);
            const userInfoResponse = await api.getUserInfo();
            const email = userInfoResponse?.data?.data?.email;

            if (email) {
              // Return the email to be saved later in the project root
              return { email };
            }
          }
        } catch (error) {
          // Silent fail, this is just a convenience feature
          logger.debug('Failed to get cloud user info', error);
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
          return {};
        }
      } catch (e) {
        /* empty */
      }
      logger.error(defaultErrorMessage);
    }
  }

  return {};
}
