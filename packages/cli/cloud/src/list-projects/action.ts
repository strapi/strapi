import type { CLIContext } from '../types';
import { cloudApiFactory, tokenServiceFactory } from '../services';
import { promptLogin } from '../login/action';

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  const { logger } = ctx;

  if (!token) {
    return;
  }

  const cloudApiService = await cloudApiFactory(ctx, token);
  const spinner = logger.spinner('Fetching your projects...').start();

  try {
    const {
      data: { data: projectList },
    } = await cloudApiService.listProjects();
    spinner.succeed();
    logger.log(projectList);
  } catch (e) {
    ctx.logger.debug('Failed to list projects', e);
    spinner.fail('An error occurred while fetching your projects from Strapi Cloud.');
  }
};
