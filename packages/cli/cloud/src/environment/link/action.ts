import chalk from 'chalk';
import inquirer, { type Answers } from 'inquirer';
import { EnvironmentDetails, ProjectInput } from '../../services/cli-api';
import type { CLIContext, CloudApiService } from '../../types';
import { cloudApiFactory, tokenServiceFactory, local } from '../../services';
import { promptLogin } from '../../login/action';
import { trackEvent } from '../../utils/analytics';
import { getLocalProject } from '../../utils/get-local-config';

const QUIT_OPTION = 'Quit';

interface LinkEnvironmentAnswer extends Answers {
  targetEnvironment: string;
}

interface LinkEnvironmentInput extends Answers {
  targetEnvironment: string;
}

type EnvironmentsList = EnvironmentDetails[];

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  const { logger } = ctx;

  if (!token) {
    return;
  }

  const project = await getLocalProject(ctx);

  if (!project) {
    logger.debug(`No valid local project configuration was found.`);
    return;
  }

  const cloudApiService = await cloudApiFactory(ctx, token);
  const environments = await getEnvironmentsList(ctx, cloudApiService, project);

  if (!environments) {
    logger.debug(`Fetching environments failed.`);
    return;
  }

  if (environments.length === 0) {
    logger.log(
      `The only available environment is already linked. You can add a new one from your project settings on the Strapi Cloud dashboard.`
    );
    return;
  }

  const answer: LinkEnvironmentAnswer | null = await promptUserForEnvironment(ctx, environments);

  if (!answer) {
    return;
  }

  await trackEvent(ctx, cloudApiService, 'willLinkEnvironment', {
    projectName: project.name,
    environmentName: answer.targetEnvironment,
  });

  try {
    await local.patch({ project: { targetEnvironment: answer.targetEnvironment } });
  } catch (e) {
    await trackEvent(ctx, cloudApiService, 'didNotLinkEnvironment', {
      projectName: project.name,
      environmentName: answer.targetEnvironment,
    });
    logger.debug('Failed to link environment', e);
    logger.error(
      'Failed to link the environment. If this issue persists, try re-linking your project or contact support.'
    );
    process.exit(1);
  }

  logger.log(
    ` You have successfully linked your project to ${chalk.cyan(answer.targetEnvironment)}, on ${chalk.cyan(project.displayName)}. You are now able to deploy your project.`
  );
  await trackEvent(ctx, cloudApiService, 'didLinkEnvironment', {
    projectName: project.name,
    environmentName: answer.targetEnvironment,
  });
};

async function promptUserForEnvironment(
  ctx: CLIContext,
  environments: EnvironmentsList
): Promise<LinkEnvironmentAnswer | null> {
  const { logger } = ctx;

  try {
    const answer: LinkEnvironmentInput = await inquirer.prompt([
      {
        type: 'list',
        name: 'targetEnvironment',
        message: 'Which environment do you want to link?',
        choices: [...environments, { name: chalk.grey(`(${QUIT_OPTION})`), value: null }],
      },
    ]);

    if (!answer.targetEnvironment) {
      return null;
    }

    return answer;
  } catch (e) {
    logger.debug('Failed to get user input', e);
    logger.error('An error occurred while trying to get your environment selection.');
    return null;
  }
}

async function getEnvironmentsList(
  ctx: CLIContext,
  cloudApiService: CloudApiService,
  project: ProjectInput
) {
  const spinner = ctx.logger.spinner('Fetching environments...\n').start();

  try {
    const {
      data: { data: environmentsList },
    } = await cloudApiService.listLinkEnvironments({ name: project.name });

    if (!Array.isArray(environmentsList) || environmentsList.length === 0) {
      throw new Error('Environments not found in server response');
    }
    spinner.succeed();
    return environmentsList.filter(
      (environment: EnvironmentDetails) => environment.name !== project.targetEnvironment
    );
  } catch (e: any) {
    if (e.response && e.response.status === 404) {
      spinner.succeed();
      ctx.logger.warn(
        `\nThe project associated with this folder does not exist in Strapi Cloud. \nPlease link your local project to an existing Strapi Cloud project using the ${chalk.cyan(
          'link'
        )} command.`
      );
    } else {
      spinner.fail('An error occurred while fetching environments data from Strapi Cloud.');
      ctx.logger.debug('Failed to list environments', e);
    }
  }
}
