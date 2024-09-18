import inquirer from 'inquirer';
import { AxiosError } from 'axios';
import { defaults } from 'lodash/fp';
import type { CLIContext, ProjectAnswers, ProjectInput } from '../types';
import { cloudApiFactory, local, tokenServiceFactory } from '../services';
import { getProjectNameFromPackageJson } from './utils/get-project-name-from-pkg';
import { promptLogin } from '../login/action';
import {
  getDefaultsFromQuestions,
  getProjectNodeVersionDefault,
  questionDefaultValuesMapper,
} from './utils/project-questions.utils';

async function handleError(ctx: CLIContext, error: Error) {
  const { logger } = ctx;
  logger.debug(error);
  if (error instanceof AxiosError) {
    const errorMessage = typeof error.response?.data === 'string' ? error.response.data : null;
    switch (error.response?.status) {
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

async function createProject(ctx: CLIContext, cloudApi: any, projectInput: ProjectInput) {
  const { logger } = ctx;
  const spinner = logger.spinner('Setting up your project...').start();
  try {
    const { data } = await cloudApi.createProject(projectInput);
    await local.save({ project: data });
    spinner.succeed('Project created successfully!');
    return data;
  } catch (e: Error | unknown) {
    spinner.fail('An error occurred while creating the project on Strapi Cloud.');
    throw e;
  }
}

export default async (ctx: CLIContext) => {
  const { logger } = ctx;
  const { getValidToken, eraseToken } = await tokenServiceFactory(ctx);

  const token = await getValidToken(ctx, promptLogin);
  if (!token) {
    return;
  }

  const cloudApi = await cloudApiFactory(ctx, token);
  const { data: config } = await cloudApi.config();
  const projectName = await getProjectNameFromPackageJson(ctx);

  const defaultAnswersMapper = questionDefaultValuesMapper({
    name: projectName,
    nodeVersion: getProjectNodeVersionDefault,
  });
  const questions = defaultAnswersMapper(config.projectCreation.questions);
  const defaultValues = {
    ...config.projectCreation.defaults,
    ...getDefaultsFromQuestions(questions),
  };

  const projectAnswersDefaulted = defaults(defaultValues);
  const projectAnswers = await inquirer.prompt<ProjectAnswers>(questions);

  const projectInput: ProjectInput = projectAnswersDefaulted(projectAnswers);

  try {
    return await createProject(ctx, cloudApi, projectInput);
  } catch (e: Error | unknown) {
    if (e instanceof AxiosError && e.response?.status === 401) {
      logger.warn('Oops! Your session has expired. Please log in again to retry.');
      await eraseToken();
      if (await promptLogin(ctx)) {
        return await createProject(ctx, cloudApi, projectInput);
      }
    } else {
      await handleError(ctx, e as Error);
    }
  }
};
