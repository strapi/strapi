import chalk from 'chalk';
import type { CLIContext } from '../../types';
import { cloudApiFactory, tokenServiceFactory } from '../../services';
import { promptLogin } from '../../login/action';
import { trackEvent } from '../../utils/analytics';
import { getLocalProject } from '../../utils/get-local-config';

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  const { logger } = ctx;

  if (!token) {
    return;
  }

  const project = await getLocalProject(ctx);
  if (!project) {
    ctx.logger.debug(`No valid local project configuration was found.`);
    return;
  }

  const cloudApiService = await cloudApiFactory(ctx, token);
  const spinner = logger.spinner('Fetching environments...').start();
  await trackEvent(ctx, cloudApiService, 'willListEnvironment', {
    projectInternalName: project.name,
  });

  try {
    const {
      data: { data: environmentsList },
    } = await cloudApiService.listEnvironments({ name: project.name });
    spinner.succeed();
    logger.log(environmentsList);
    await trackEvent(ctx, cloudApiService, 'didListEnvironment', {
      projectInternalName: project.name,
    });
  } catch (e: any) {
    if (e.response && e.response.status === 404) {
      spinner.succeed();
      logger.warn(
        `\nThe project associated with this folder does not exist in Strapi Cloud. \nPlease link your local project to an existing Strapi Cloud project using the ${chalk.cyan(
          'link'
        )} command`
      );
    } else {
      spinner.fail('An error occurred while fetching environments data from Strapi Cloud.');
      logger.debug('Failed to list environments', e);
    }
    await trackEvent(ctx, cloudApiService, 'didNotListEnvironment', {
      projectInternalName: project.name,
    });
  }
};
