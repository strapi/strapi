import type { CLIContext } from '../types';
import { tokenServiceFactory, cloudApiFactory } from '../services';

export default async (ctx: CLIContext) => {
  const { logger } = ctx;
  const { retrieveToken, eraseToken } = await tokenServiceFactory(ctx);

  const token = await retrieveToken();
  if (!token) {
    logger.log("You're already logged out.");
    return;
  }
  const cloudApiService = await cloudApiFactory(token);
  try {
    // we might want also to perform extra actions like logging out from the auth0 tenant
    await eraseToken();
    logger.log(
      '🔌 You have been logged out from the CLI. If you are on a shared computer, please make sure to log out from the Strapi Cloud Dashboard as well.'
    );
  } catch (e) {
    logger.error('🥲 Oops! Something went wrong while logging you out. Please try again.');
    logger.debug(e);
  }
  try {
    await cloudApiService.track('didLogout', { loginMethod: 'cli' });
  } catch (e) {
    logger.debug('Failed to track logout event', e);
  }
};
