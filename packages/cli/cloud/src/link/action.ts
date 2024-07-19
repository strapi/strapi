import inquirer from 'inquirer';
import chalk from 'chalk';

import type { Answers } from 'inquirer';
import type { CLIContext } from '../types';
import type { CloudApiService } from '../services/cli-api';

import { LocalSave } from '../services/strapi-info-save';
import { cloudApiFactory, tokenServiceFactory, local } from '../services';
import { promptLogin } from '../login/action';
import { trackEvent } from '../utils/analytics';

const QUIT_OPTION = 'Quit';

interface LinkProjectValue {
  name: string;
  displayName: string;
}

interface LinkProjectAnswer extends Answers {
  linkProject: LinkProjectValue;
}

interface LinkProjectInput extends Answers {
  linkProject: LinkProjectValue | string;
}

type ProjectsList = {
  name: string;
  value: {
    name: string;
    displayName: string;
  };
}[];

async function getExistingConfig(ctx: CLIContext, cloudApiService: CloudApiService) {
  let existingConfig: LocalSave;
  try {
    existingConfig = await local.retrieve();
    if (existingConfig.project) {
      const { shouldRelink } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldRelink',
          message: `A project named ${chalk.cyan(
            existingConfig.project.displayName
              ? existingConfig.project.displayName
              : existingConfig.project.name
          )} is already linked to this local folder. Do you want to update the link?`,
          default: false,
        },
      ]);

      if (!shouldRelink) {
        await trackEvent(ctx, cloudApiService, 'didNotLinkProject', {
          currentProjectName: existingConfig.project?.name,
        });
        return null;
      }
    }
  } catch (e) {
    ctx.logger.debug('Failed to get project config', e);
    ctx.logger.error('An error occurred while retrieving config data from your local project.');
    return null;
  }

  return existingConfig;
}

async function getProjectsList(
  ctx: CLIContext,
  cloudApiService: CloudApiService,
  existingConfig: LocalSave
) {
  const spinner = ctx.logger.spinner('Fetching your projects...\n').start();

  try {
    const {
      data: { data: projectList },
    } = await cloudApiService.listLinkProjects();
    spinner.succeed();
    const projects: ProjectsList = Object.values(projectList)
      .filter(
        (project: any) => !(project.isMaintainer || project.name === existingConfig?.project?.name)
      )
      .map((project: any) => {
        return {
          name: project.displayName,
          value: { name: project.name, displayName: project.displayName },
        };
      });
    if (projects.length === 0) {
      ctx.logger.log("We couldn't find any projects available for linking in Strapi Cloud");
      return null;
    }
    return projects;
  } catch (e) {
    spinner.fail('An error occurred while fetching your projects from Strapi Cloud.');
    ctx.logger.debug('Failed to list projects', e);
    return null;
  }
}

async function getUserSelection(
  projects: ProjectsList,
  logger: any
): Promise<LinkProjectAnswer | null> {
  try {
    const answer: LinkProjectInput = await inquirer.prompt([
      {
        type: 'list',
        name: 'linkProject',
        message: 'Which project do you want to link?',
        choices: [...projects, { name: chalk.grey(`(${QUIT_OPTION})`), value: null }],
      },
    ]);

    if (!answer.linkProject) {
      return null;
    }

    return answer as LinkProjectAnswer;
  } catch (e) {
    logger.debug('Failed to get user input', e);
    logger.error('An error occurred while trying to get your input.');
    return null;
  }
}

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  const { logger } = ctx;

  if (!token) {
    return;
  }

  const cloudApiService = await cloudApiFactory(ctx, token);

  const existingConfig: LocalSave | null = await getExistingConfig(ctx, cloudApiService);
  // If user selects not to relink, return
  if (!existingConfig) {
    return;
  }

  await trackEvent(ctx, cloudApiService, 'willLinkProject', {});

  const projects: ProjectsList | null | undefined = await getProjectsList(
    ctx,
    cloudApiService,
    existingConfig
  );

  if (!projects) {
    return;
  }

  const answer: LinkProjectAnswer | null = await getUserSelection(projects, logger);

  if (!answer) {
    return;
  }

  try {
    const { confirmAction } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmAction',
        message:
          'Warning: Once linked, deploying from CLI will replace the existing project and its data. Confirm to proceed:',
        default: false,
      },
    ]);

    if (!confirmAction) {
      await trackEvent(ctx, cloudApiService, 'didNotLinkProject', {
        cancelledProjectName: answer.linkProject.name,
        currentProjectName: existingConfig.project?.name,
      });
      return;
    }

    await local.save({ project: answer.linkProject });
    logger.log(`Project ${chalk.cyan(answer.linkProject.displayName)} linked successfully.`);
    await trackEvent(ctx, cloudApiService, 'didLinkProject', {
      projectInternalName: answer.linkProject,
    });
  } catch (e) {
    logger.debug('Failed to link project', e);
    logger.error('An error occurred while linking the project.');
    await trackEvent(ctx, cloudApiService, 'didNotLinkProject', {
      projectInternalName: answer.linkProject,
    });
  }
};
