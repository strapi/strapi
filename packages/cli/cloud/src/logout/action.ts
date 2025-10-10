import type { CLIContext } from '../types';
import { tokenServiceFactory, cloudApiFactory } from '../services';
import { trackEvent } from '../utils/analytics';

const openModule = import('open');

export default async (ctx: CLIContext) => {
  const { logger } = ctx;
  const { retrieveToken, eraseToken } = await tokenServiceFactory(ctx);

  const token = await retrieveToken();
  if (!token) {
    logger.log("You're already logged out.");
    return;
  }
  const cloudApiService = await cloudApiFactory(ctx, token);
  const config = await cloudApiService.config();
  const cliConfig = config.data;

  try {
    await eraseToken();

    openModule.then((open) => {
      open
        .default(
          `${cliConfig.baseUrl}/oidc/logout?client_id=${encodeURIComponent(
            cliConfig.clientId
          )}&logout_hint=${encodeURIComponent(token)}
          `
        )
        .catch((e: Error) => {
          // Failing to open the logout URL is not a critical error, so we just log it
          logger.debug(e.message, e);
        });
    });

    logger.log(
      '🔌 You have been logged out from the CLI. If you are on a shared computer, please make sure to log out from the Strapi Cloud Dashboard as well.'
    );
  } catch (e) {
    logger.error('🥲 Oops! Something went wrong while logging you out. Please try again.');
    logger.debug(e);
  }
  await trackEvent(ctx, cloudApiService, 'didLogout', { loginMethod: 'cli' });
};
