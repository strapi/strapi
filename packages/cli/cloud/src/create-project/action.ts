import inquirer from 'inquirer';
import { AxiosError } from 'axios';
import { defaults } from 'lodash/fp';
import {
  CLIContext,
  CloudApiService,
  CloudCliConfig,
  CreateProjectResponse,
  ProjectAnswers,
  ProjectInput,
} from '../types';
import { cloudApiFactory, local, tokenServiceFactory } from '../services';
import { VERSION } from '../services/cli-api';
import { getProjectNameFromPackageJson } from './utils/get-project-name-from-pkg';
import { promptLogin } from '../login/action';
import {
  getDefaultsFromQuestions,
  getProjectNodeVersionDefault,
  questionDefaultValuesMapper,
} from './utils/project-questions.utils';
import { apiConfig } from '../config/api';
import { notificationServiceFactory } from '../services/notification';
import {
  environmentCreationErrorFactory,
  environmentErrorMessageFactory,
} from '../utils/error-message-factories';

async function handleError(ctx: CLIContext, error: Error) {
  const { logger } = ctx;
  logger.debug(error);
  if (error instanceof AxiosError) {
    const errorMessage = typeof error.response?.data === 'string' ? error.response.data : null;
    switch (error.response?.status) {
      case 400:
        logger.error(errorMessage || 'Invalid input. Please check your inputs and try again.');
        return;
      case 403:
        logger.error(
          errorMessage ||
            'You do not have permission to create a project. Please contact support for assistance.'
        );
        return;
      case 503:
        logger.error(
          'Strapi Cloud project creation is currently unavailable. Please try again later.'
        );
        return;
      default:
        if (errorMessage) {
          logger.error(errorMessage);
          throw error;
        }
        break;
    }
  }
  logger.error(
    'We encountered an issue while creating your project. Please try again in a moment. If the problem persists, contact support for assistance.'
  );
}

async function createProject(
  ctx: CLIContext,
  cloudApi: CloudApiService,
  projectInput: ProjectInput,
  token: string,
  config: CloudCliConfig
) {
  const { logger } = ctx;
  const projectSpinner = logger.spinner('Setting up your project...').start();
  projectSpinner.indent = 1;
  const notificationService = notificationServiceFactory(ctx);
  const { waitForEnvironmentCreation, close } = notificationService(
    `${apiConfig.apiBaseUrl}/${VERSION}/notifications`,
    token,
    config
  );
  let projectData: CreateProjectResponse;
  try {
    const { data } = await cloudApi.createProject(projectInput);
    projectData = data;
    await local.save({ project: data });
    projectSpinner.succeed('Project created successfully!');
  } catch (e: Error | unknown) {
    projectSpinner.fail(`An error occurred while creating the project on Strapi Cloud.`);
    close();
    throw e;
  }
  if (config.featureFlags.asyncProjectCreationEnabled) {
    const environmentSpinner = logger
      .spinner('Setting up your environment... This may take a minute...')
      .start();
    environmentSpinner.indent = 1;
    try {
      await waitForEnvironmentCreation(projectData.environmentInternalName);
      environmentSpinner.succeed('Environment created successfully!\n');
    } catch (e: Error | unknown) {
      environmentSpinner.fail(
        `An error occurred while creating the environment on Strapi Cloud.\n`
      );
      const environmentErrorMessage = environmentErrorMessageFactory({
        projectName: projectData.name,
        firstLine: config.projectCreation.errors.environmentCreationFailed.firstLine,
        secondLine: config.projectCreation.errors.environmentCreationFailed.secondLine,
      });
      logger.log(environmentCreationErrorFactory(environmentErrorMessage));
      return;
    }
  }
  close();
  return projectData;
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
    return await createProject(ctx, cloudApi, projectInput, token, config);
  } catch (e: Error | unknown) {
    if (e instanceof AxiosError && e.response?.status === 401) {
      logger.warn('Oops! Your session has expired. Please log in again to retry.');
      await eraseToken();
      if (await promptLogin(ctx)) {
        return await createProject(ctx, cloudApi, projectInput, token, config);
      }
    } else {
      await handleError(ctx, e as Error);
    }
  }
};
