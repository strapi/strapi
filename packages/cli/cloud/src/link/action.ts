import inquirer from 'inquirer';
import chalk from 'chalk';

import type { CLIContext } from '../types';
import { cloudApiFactory, tokenServiceFactory, local } from '../services';
import { promptLogin } from '../login/action';

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  const { logger } = ctx;

  if (!token) {
    return;
  }

  try {
    const existingConfig = await local.retrieve();
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
        return;
      }
    }
  } catch (e) {
    logger.debug('Failed to check project config', e);
    logger.error('An error occurred while trying to link the project.');
  }

  const cloudApiService = await cloudApiFactory(ctx, token);
  const spinner = logger.spinner('Fetching your projects...\n').start();
  try {
    const {
      data: { data: projectList },
    } = await cloudApiService.listLinkProjects();
    spinner.succeed();
    const projects = Object.values(projectList)
      .filter((project: any) => !project.isMaintainer)
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
    await inquirer
      .prompt([
        {
          type: 'list',
          name: 'linkProject',
          message: 'Which project do you want to link?',
          choices: [...projects],
        },
      ])
      .then(async (answer) => {
        try {
          await local.save({ project: { ...answer.linkProject } }, { override: true });
          logger.log(`Project ${chalk.cyan(answer.linkProject.displayName)} linked successfully.`);
        } catch (e) {
          logger.debug('Failed to save project', e);
          logger.error('An error occurred while linking the project.');
        }
      });
  } catch (e) {
    ctx.logger.debug('Failed to list projects', e);
    spinner.fail('An error occurred while fetching your projects from Strapi Cloud.');
  }
};
