import inquirer from 'inquirer';
import { AxiosError } from 'axios';
import { defaults } from 'lodash/fp';
import type { CLIContext, ProjectAnswers, ProjectInput } from '../types';
import { tokenServiceFactory, cloudApiFactory, local } from '../services';

async function handleError(ctx: CLIContext, error: Error) {
  const tokenService = await tokenServiceFactory(ctx);
  const { logger } = ctx;

  logger.debug(error);
  if (error instanceof AxiosError) {
    const errorMessage = typeof error.response?.data === 'string' ? error.response.data : null;
    switch (error.response?.status) {
      case 401:
        logger.error('Your session has expired. Please log in again.');
        await tokenService.eraseToken();
        return;
      case 403:
        logger.error(
          errorMessage ||
            'You do not have permission to create a project. Please contact support for assistance.'
        );
        return;
      case 400:
        logger.error(errorMessage || 'Invalid input. Please check your inputs and try again.');
        return;
      case 503:
        logger.error(
          'Strapi Cloud project creation is currently unavailable. Please try again later.'
        );
        return;
      default:
        if (errorMessage) {
          logger.error(errorMessage);
          return;
        }
        break;
    }
  }
  logger.error(
    'We encountered an issue while creating your project. Please try again in a moment. If the problem persists, contact support for assistance.'
  );
}

export default async (ctx: CLIContext) => {
  const { logger } = ctx;
  const { getValidToken } = await tokenServiceFactory(ctx);

  const token = await getValidToken();
  if (!token) {
    return;
  }
  const cloudApi = await cloudApiFactory(ctx, token);
  const { data: config } = await cloudApi.config();
  const { questions, defaults: defaultValues } = config.projectCreation;

  const projectAnswersDefaulted = defaults(defaultValues);
  const projectAnswers = await inquirer.prompt<ProjectAnswers>(questions);

  const projectInput: ProjectInput = projectAnswersDefaulted(projectAnswers);

  const spinner = logger.spinner('Setting up your project...').start();
  try {
    const { data } = await cloudApi.createProject(projectInput);
    await local.save({ project: data });
    spinner.succeed('Project created successfully!');
    return data;
  } catch (e: Error | unknown) {
    spinner.fail('Failed to create project on Strapi Cloud.');
    await handleError(ctx, e as Error);
  }
};
