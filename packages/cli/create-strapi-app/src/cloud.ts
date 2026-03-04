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

export async function handleCloudLogin(): Promise<boolean> {
  const logger = cloudServices.createLogger({
    silent: false,
    debug: process.argv.includes('--debug'),
    timestamp: false,
  });
  const cloudApiService = await cloudServices.cloudApiFactory({ logger });
  const defaultErrorMessage =
    'An error occurred while trying to interact with Strapi servers. Use strapi deploy command once the project is generated.';

  let cloudApiConfig;
  try {
    const { data: config } = await cloudApiService.config();
    cloudApiConfig = config;

    if (!config?.featureFlags?.cloudLoginPromptEnabled) {
      return false;
    }

    logger.log(parseToChalk(config.projectCreation.introText));
  } catch (e: unknown) {
    logger.debug(e);
    logger.error(defaultErrorMessage);
    return false;
  }
  const { userChoice } = await inquirer.prompt<{ userChoice: string }>(
    cloudApiConfig.projectCreation?.userChoice || [
      {
        type: 'list',
        name: 'userChoice',
        message: `Please log in or sign up.`,
        choices: ['Login/Sign up', 'Skip'],
      },
    ]
  );

  if (!userChoice.toLowerCase().includes('skip')) {
    const cliContext = {
      user: { id: '' }, // This will be set later when the user logs in
      logger,
      cwd: process.cwd(),
      ...(cloudApiConfig.projectCreation?.reference && {
        promptExperiment: cloudApiConfig.projectCreation?.reference,
      }),
    };

    try {
      await cloudCli.login.action(cliContext, { showDashboardLink: false });
    } catch (e: Error | CloudError | unknown) {
      logger.debug(e);
      try {
        assertCloudError(e);
        if (e.response.status === 403) {
          const message =
            typeof e.response.data === 'string'
              ? e.response.data
              : 'We are sorry, but we are not able to log you into Strapi servers at the moment.';
          logger.warn(message);
          return false;
        }
      } catch (e) {
        /* empty */
      }
      logger.error(defaultErrorMessage);
      return false;
    }

    return true;
  }

  return false;
}
