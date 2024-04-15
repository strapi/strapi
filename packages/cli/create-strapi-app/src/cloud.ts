import inquirer from 'inquirer';
import { resolve } from 'node:path';
import { cli as cloudCli, services as cloudServices } from '@strapi/cloud-cli';

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

export async function handleCloudProject(projectName: string): Promise<void> {
  const { isCloudProjectAsked } = await inquirer.prompt<{ isCloudProjectAsked: boolean }>([
    {
      type: 'confirm',
      name: 'isCloudProjectAsked',
      message: 'Do you want to connect to Strapi Cloud and host your Strapi project?',
    },
  ]);

  if (isCloudProjectAsked) {
    const logger = cloudServices.createLogger({
      silent: false,
      debug: process.argv.includes('--debug'),
      timestamp: false,
    });
    const cliContext = {
      logger,
      cwd: process.cwd(),
    };
    const tokenService = cloudServices.tokenServiceFactory(cliContext);

    try {
      await cloudCli.login.action(cliContext);
      const token = await tokenService.retrieveToken();

      const cloudApiService = cloudServices.cloudApiFactory(token);
      const { data: config } = await cloudApiService.config();
      const defaultProjectValues = config.projectCreation?.defaults || {};
      const { data: project } = await cloudApiService.createProject({
        nodeVersion: process.versions?.node?.slice(1, 3) || '20',
        region: 'NYC',
        plan: 'trial',
        ...defaultProjectValues,
        name: projectName,
      });
      const projectPath = resolve(projectName);
      cloudServices.local.save({ project }, { directoryPath: projectPath });
    } catch (e: Error | CloudError | unknown) {
      logger.debug(e);
      try {
        assertCloudError(e);
        if (e.response.status === 403) {
          const message =
            typeof e.response.data === 'string'
              ? e.response.data
              : 'We are sorry, but we are not able to create a Strapi Cloud project for you at the moment.';
          logger.warn(message);
          return;
        }
      } catch (e) {
        /* empty */
      }
      logger.error(
        'An error occurred while trying to interact with Strapi Cloud. Use strapi deploy command once the project is generated.'
      );
    }
  }
}
