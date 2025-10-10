import chalk from 'chalk';
import type { CLIContext } from '../types';
import { local } from '../services';
import { LocalSave } from '../services/strapi-info-save';

async function getLocalConfig(ctx: CLIContext): Promise<LocalSave | null> {
  try {
    return await local.retrieve();
  } catch (e) {
    ctx.logger.debug('Failed to get project config', e);
    ctx.logger.error('An error occurred while retrieving config data from your local project.');
    return null;
  }
}

async function getLocalProject(ctx: CLIContext) {
  const localConfig = await getLocalConfig(ctx);

  if (!localConfig || !localConfig.project) {
    ctx.logger.warn(
      `\nWe couldn't find a valid local project config.\nPlease link your local project to an existing Strapi Cloud project using the ${chalk.cyan(
        'link'
      )} command.`
    );
    process.exit(1);
  }
  return localConfig.project;
}

export { getLocalConfig, getLocalProject };
