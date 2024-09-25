import chalk from 'chalk';
import type { CLIContext } from '../../types';
import { cloudApiFactory, local, tokenServiceFactory } from '../../services';
import { promptLogin } from '../../login/action';

async function getProject(ctx: CLIContext) {
  const { project } = await local.retrieve();
  if (!project) {
    ctx.logger.warn(
      `\nWe couldn't find a valid local project config.\nPlease link your local project to an existing Strapi Cloud project using the ${chalk.cyan(
        'link'
      )} command`
    );
    process.exit(1);
  }
  return project;
}

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  const { logger } = ctx;

  if (!token) {
    return;
  }

  const project = await getProject(ctx);
  if (!project) {
    return;
  }

  const cloudApiService = await cloudApiFactory(ctx, token);
  const spinner = logger.spinner('Fetching environments...').start();

  try {
    const {
      data: { data: environmentsList },
    } = await cloudApiService.listEnvironments({ name: project.name });
    spinner.succeed();
    logger.log(environmentsList);
  } catch (e: any) {
    if (e.response && e.response.status === 404) {
      spinner.succeed();
      logger.warn(
        `\nThe project associated with this folder does not exist in Strapi Cloud. \nPlease link your local project to an existing Strapi Cloud project using the ${chalk.cyan(
          'link'
        )} command`
      );
    } else {
      ctx.logger.debug('Failed to list environments', e);
      spinner.fail('An error occurred while fetching environments data from Strapi Cloud.');
    }
  }
};
