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

export async function handleCloudLogin(): Promise<{
  // Modify the return type to include user information
  // TODO will return more (first name, last name) but `strapi/cloud` is currently limited to email
  email: string;
} | void> {
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
      // Adjusted `cloudCli.login.action` to return the user info available at the moment
      const {
        // @ts-expect-error WIP
        userInfo: {
          // TODO just working with email for now it would require changes on `strapi/cloud` to access firstname and lastname
          email,
        },
      } = await cloudCli.login.action(cliContext);

      return { email };
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
