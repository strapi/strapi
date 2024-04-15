import inquirer from 'inquirer';
import { cloudApiFactory } from './services/cli-api';
import { tokenServiceFactory } from './utils/token';
import type { CLIContext } from '../../types';

type ProjectAnswers = {
  name: string;
  nodeVersion: '18' | '20';
  region: 'AMS' | 'NYC';
};

const action = async (ctx: CLIContext) => {
  const { logger } = ctx;
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken();
  if (!token) {
    return;
  }

  const projectInputs = await inquirer.prompt<ProjectAnswers>([
    {
      type: 'input',
      default: 'my-strapi-project',
      name: 'name',
      message: 'What would you like to name your project?',
    },
    {
      type: 'list',
      name: 'nodeVersion',
      default: '20',
      message: 'Choose your NodeJS version (default: 20)',
      choices: [
        {
          name: '20 (recommended)',
          value: '20',
        },
        {
          name: '18',
          value: '18',
        },
      ],
    },
    {
      type: 'list',
      name: 'region',
      message: 'Choose a region for your project',
      choices: [
        {
          name: 'Europe (Amsterdam)',
          value: 'AMS',
        },
        {
          name: 'United States (New York City)',
          value: 'NYC',
        },
      ],
    },
  ]);

  const cloudApi = cloudApiFactory(token);
  try {
    const { data } = await cloudApi.createProject({
      ...projectInputs,
      deploymentId: '123456789',
      trackingId: '123456789',
    });
    return data;
  } catch (error) {
    logger.error(
      'We encountered an issue while creating your project. Please try again in a moment. If the problem persists, contact support for assistance.'
    );
    logger.debug(error);
  }
};

export { action };
