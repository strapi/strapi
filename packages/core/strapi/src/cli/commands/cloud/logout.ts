import { createCommand } from 'commander';
import type { CLIContext, StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { tokenServiceFactory } from './utils/token';

const action = (ctx: CLIContext) => {
  const { logger } = ctx;
  const { retrieveToken, eraseToken } = tokenServiceFactory(ctx);

  return async () => {
    const token = await retrieveToken();
    if (!token) {
      logger.log("You're already logged out.");
      return;
    }
    try {
      // we might want also to perform extra actions like logging out from the auth0 tenant
      await eraseToken();
      logger.log('🔌 You have been logged out.');
    } catch (error) {
      logger.error('🥲 Oops! Something went wrong while logging you out. Please try again.');
      logger.debug(error);
    }
  };
};

/**
 * `$ cloud device flow logout`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('cloud:logout')
    .command('logout')
    .description('Strapi Cloud Logout')
    .action(runAction('logout', action(ctx)));
};

export { action, command };
