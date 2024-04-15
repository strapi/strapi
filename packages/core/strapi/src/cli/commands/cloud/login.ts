import axios, { AxiosError, AxiosResponse } from 'axios';
import { createCommand } from 'commander';
import type { CLIContext, StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { cloudApiFactory } from './services/cli-api';
import { CloudCliConfig } from './types';
import { tokenServiceFactory } from './utils/token';

const openModule = import('open');

const cloudApiService = cloudApiFactory();

const action = (ctx: CLIContext) => {
  const { logger } = ctx;
  const tokenService = tokenServiceFactory(ctx);

  return async () => {
    let cliConfig: CloudCliConfig;
    try {
      logger.info('🔌 Connecting to the Strapi Cloud API...');
      const config = await cloudApiService.config();
      cliConfig = config.data;
    } catch (error: unknown) {
      logger.error('🥲 Oops! Something went wrong while logging you in. Please try again.');
      logger.debug(error);
      return;
    }

    const deviceAuthResponse = (await axios
      .post(cliConfig.deviceCodeAuthUrl, {
        client_id: cliConfig.clientId,
        scope: cliConfig.scope,
        audience: cliConfig.audience,
      })
      .catch((error: AxiosError) => {
        logger.error('There was an issue with the authentication process. Please try again.');
        if (error.message) {
          logger.debug(error.message, error);
        } else {
          logger.debug(error);
        }
      })) as AxiosResponse;

    openModule.then((open) => {
      open.default(deviceAuthResponse.data.verification_uri_complete).catch((err: Error) => {
        logger.error('We encountered an issue opening the browser. Please try again later.');
        logger.debug(err.message, err);
      });
    });

    logger.log('If a browser tab does not open automatically, please follow the next steps:');
    logger.log(
      `1. Open this url in your device: ${deviceAuthResponse.data.verification_uri_complete}`
    );
    logger.log(
      `2. Enter the following code: ${deviceAuthResponse.data.user_code} and confirm to login.`
    );

    const token_payload = {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceAuthResponse.data.device_code,
      client_id: cliConfig.clientId,
    };

    let isAuthenticated = false;

    const authenticate = async () => {
      while (!isAuthenticated) {
        logger.log(
          `⏳ Checking if the authentication process is complete... retrying again in ${deviceAuthResponse.data.interval} seconds.`
        );
        try {
          const token_response = await axios.post(cliConfig.tokenUrl, token_payload);
          const authTokenData = token_response.data;
          if (token_response.status === 200) {
            // Token validation
            try {
              await tokenService.validateToken(authTokenData.id_token, cliConfig.jwksUrl);
            } catch (error: any) {
              logger.debug(error);
              throw new Error('Unable to proceed: Token validation failed');
            }
            isAuthenticated = true;
            logger.success('🚀 Authentication successful!');
            try {
              await tokenService.saveToken(authTokenData.access_token);
            } catch (error) {
              logger.error(
                'There was a problem saving your login information. Please try logging in again.'
              );
              logger.debug(error);
            }
          }
        } catch (error: any) {
          if (error.message === 'Unable to proceed: Token validation failed') {
            logger.error(
              'There seems to be a problem with your login information. Please try logging in again.'
            );
            return;
          } else if (
            error.response?.data.error &&
            !['authorization_pending', 'slow_down'].includes(error!.response.data.error)
          ) {
            logger.debug(error);
            return;
          } else {
            // Await interval before retrying
            await new Promise((resolve) =>
              setTimeout(resolve, deviceAuthResponse.data.interval * 1000)
            );
          }
        }
      }
    };

    await authenticate();
  };
};

/**
 * `$ cloud device flow login`
 */
const command: StrapiCommand = ({ ctx }) => {
  return createCommand('cloud:login')
    .alias('login')
    .description('Strapi Cloud Login')
    .action(runAction('login', action(ctx)));
};

export { action, command };
