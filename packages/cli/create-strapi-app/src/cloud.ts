import inquirer from 'inquirer';
import { cli as cloudCli, services as cloudServices } from '@strapi/cloud-cli';
import parseToChalk from './utils/parse-to-chalk';
import { experimentPrompt } from './experiment/prompt';

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

export async function handleCloudLogin(): Promise<void> {
  const logger = cloudServices.createLogger({
    silent: false,
    debug: process.argv.includes('--debug'),
    timestamp: false,
  });
  const cloudApiService = await cloudServices.cloudApiFactory({ logger });
  const defaultErrorMessage =
    'An error occurred while trying to interact with Strapi Cloud. Use strapi deploy command once the project is generated.';

  const defaultPrompt = {
    introText: '',
    choices: ['Login/Sign up', 'Skip for now'],
    message: 'Please log in or sign up.',
    reference: null,
  };
  const useExperiment = Math.random() < 0.5;

  const promptToUse = useExperiment ? experimentPrompt : defaultPrompt;

  try {
    const { data: config } = await cloudApiService.config();

    if (!useExperiment) {
      promptToUse.introText = config.projectCreation.introText;
    }

    logger.log(parseToChalk(promptToUse.introText));
  } catch (e: unknown) {
    logger.debug(e);
    logger.error(defaultErrorMessage);
    return;
  }
  const { userChoice } = await inquirer.prompt<{ userChoice: string }>([
    {
      type: 'list',
      name: 'userChoice',
      message: promptToUse.message,
      choices: promptToUse.choices,
    },
  ]);

  if (!userChoice.includes('Skip')) {
    const cliContext = {
      logger,
      cwd: process.cwd(),
      ...(promptToUse?.reference && { promptExperiment: promptToUse?.reference }),
    };

    try {
      await cloudCli.login.action(cliContext);
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
