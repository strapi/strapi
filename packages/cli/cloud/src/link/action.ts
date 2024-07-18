import inquirer from 'inquirer';
import chalk from 'chalk';

import type { Answers } from 'inquirer';
import type { CLIContext } from '../types';
import { LocalSave } from '../services/strapi-info-save';
import { cloudApiFactory, tokenServiceFactory, local } from '../services';
import { promptLogin } from '../login/action';
import { trackEvent } from '../utils/analytics';

interface LinkProjectValue {
  name: string;
  displayName: string;
}

interface LinkProjectAnswer extends Answers {
  linkProject: LinkProjectValue | 'quit';
}

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  const { logger } = ctx;

  if (!token) {
    return;
  }

  let existingConfig: LocalSave | null;

  try {
    existingConfig = await getExistingConfig(ctx, logger);
    // If user selects not to relink, return
    if (existingConfig === null) {
      return;
    }
  } catch (e) {
    return;
  }

  const cloudApiService = await cloudApiFactory(ctx, token);

  try {
    await trackEvent(cloudApiService, 'willLinkProject', {}, ctx);
  } catch (e) {
    /* noop */
  }

  const spinner = logger.spinner('Fetching your projects...\n').start();
  let projects: unknown[] = [];

  try {
    const {
      data: { data: projectList },
    } = await cloudApiService.listLinkProjects();
    spinner.succeed();
    projects = Object.values(projectList)
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
      logger.log("We couldn't find any projects available for linking in Strapi Cloud");
      return;
    }
  } catch (e) {
    ctx.logger.debug('Failed to list projects', e);
    spinner.fail('An error occurred while fetching your projects from Strapi Cloud.');
  }

  let answer: LinkProjectAnswer | null = null;
  try {
    answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'linkProject',
        message: 'Which project do you want to link?',
        choices: [...projects, { name: chalk.grey('(Quit)'), value: 'quit' }],
      },
    ]);

    if (answer === null || answer.linkProject === 'quit') {
      return;
    }

    const { confirmLink } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmLink',
        message:
          'Warning: Once linked, deploying from CLI will replace the existing project and its data. Confirm to proceed:',
        default: false,
      },
    ]);

    if (!confirmLink) {
      try {
        await trackEvent(
          cloudApiService,
          'didNotLinkProject',
          { projectInternalName: answer.linkProject },
          ctx
        );
      } catch (e) {
        /* noop */
      }
      return;
    }
  } catch (e) {
    logger.error('Failed to get user input', e);
    return;
  }

  try {
    await local.save({ project: answer.linkProject });
    logger.log(`Project ${chalk.cyan(answer.linkProject.displayName)} linked successfully.`);
    try {
      await trackEvent(
        cloudApiService,
        'didLinkProject',
        { projectInternalName: answer.linkProject },
        ctx
      );
    } catch (e) {
      /* noop */
    }
  } catch (e) {
    logger.debug('Failed to link project', e);
    logger.error('An error occurred while linking the project.');
    await trackEvent(
      cloudApiService,
      'didNotLinkProject',
      { projectInternalName: answer.linkProject },
      ctx
    );
  }
};

async function getExistingConfig(ctx: CLIContext, logger: any) {
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
        return null;
      }
    }
  } catch (e) {
    logger.debug('Failed to check project config', e);
    logger.error('An error occurred while trying to link the project.');
    throw e;
  }

  return existingConfig;
}
