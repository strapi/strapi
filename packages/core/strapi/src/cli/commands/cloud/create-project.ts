import { AxiosError } from 'axios';
import inquirer from 'inquirer';
import { defaults } from 'lodash/fp';
import { cloudApiFactory, type ProjectInput } from './services/cli-api';
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
  const { questions, defaults: defaultValues } = config.projectCreation;

  const projectAnswersDefaulted = defaults(defaultValues);
  const projectAnswers = await inquirer.prompt<ProjectAnswers>(questions);
  const projectInput: ProjectInput = projectAnswersDefaulted(projectAnswers);

  try {
    const { data } = await cloudApi.createProject({ plan: 'trial', ...projectInput });
    return data;
  } catch (error: Error | unknown) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 400) {
        logger.error(
          error.response?.data?.message ||
            'An error occurred while creating your project. Please check your inputs and try again.'
        );
        return null;
      }
    }
    logger.error(
      'We encountered an issue while creating your project. Please try again in a moment. If the problem persists, contact support for assistance.'
    );
    logger.debug(error);
  }
};

export { action };
