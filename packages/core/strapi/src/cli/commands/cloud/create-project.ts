import inquirer from 'inquirer';
import { cloudApiFactory } from './services/cli-api';
import { tokenServiceFactory } from './utils/token';
import type { CLIContext } from '../../types';
import type { ProjectAnswers } from './types';

const action = async (ctx: CLIContext) => {
  const { logger } = ctx;
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken();
  if (!token) {
    return;
  }

  const cloudApi = cloudApiFactory(token);
  const { data: config } = await cloudApi.config();
  const projectInputs = await inquirer.prompt<ProjectAnswers>(config.projectQuestions);
  try {
    const { data } = await cloudApi.createProject({ planPriceId: 'trial', ...projectInputs });
    return data;
  } catch (error: any) {
    if (error.response?.status === 400) {
      logger.error(
        error.response?.data?.message ||
          'An error occurred while creating your project. Please check your inputs and try again.'
      );
      return null;
    }
    logger.error(
      'We encountered an issue while creating your project. Please try again in a moment. If the problem persists, contact support for assistance.'
    );
    logger.debug(error);
  }
};

export { action };
