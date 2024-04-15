import axios, { AxiosResponse, AxiosError } from 'axios';
import { tokenServiceFactory, cloudApiFactory } from '../services';

import type { CloudCliConfig, CLIContext } from '../types';

const openModule = import('open');
const cloudApiService = cloudApiFactory();

export default async (ctx: CLIContext) => {
  const { logger } = ctx;
  const tokenService = tokenServiceFactory(ctx);

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

  logger.debug('🔐 Creating device authentication request...', {
    client_id: cliConfig.clientId,
    scope: cliConfig.scope,
    audience: cliConfig.audience,
  });
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
    `2. Enter the following code: ${deviceAuthResponse.data.user_code} and confirm to login.\n`
  );

  const tokenPayload = {
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: deviceAuthResponse.data.device_code,
    client_id: cliConfig.clientId,
  };

  let isAuthenticated = false;

  const authenticate = async () => {
    const spinner = logger.spinner('Waiting for authentication');
    spinner.start();
    const spinnerFail = () => spinner.fail('Authentication failed!');
    while (!isAuthenticated) {
      try {
        const tokenResponse = await axios.post(cliConfig.tokenUrl, tokenPayload);
        const authTokenData = tokenResponse.data;

        if (tokenResponse.status === 200) {
          // Token validation
          try {
            logger.debug('🔐 Validating token...');
            await tokenService.validateToken(authTokenData.id_token, cliConfig.jwksUrl);
            logger.debug('🔐 Token validation successful!');
          } catch (error: any) {
            logger.debug(error);
            spinnerFail();
            throw new Error('Unable to proceed: Token validation failed');
          }
          const cloudApiService = cloudApiFactory(authTokenData.access_token);

          logger.debug('🔍 Fetching user information...');
          // Call to get user info to create the user in DB if not exists
          await cloudApiService.getUserInfo();
          logger.debug('🔍 User information fetched successfully!');

          try {
            logger.debug('📝 Saving login information...');
            await tokenService.saveToken(authTokenData.access_token);
            logger.debug('📝 Login information saved successfully!');
            isAuthenticated = true;
          } catch (error) {
            logger.error(
              'There was a problem saving your login information. Please try logging in again.'
            );
            logger.debug(error);
            spinnerFail();
            return;
          }
        }
      } catch (error: any) {
        if (error.message === 'Unable to proceed: Token validation failed') {
          logger.error(
            'There seems to be a problem with your login information. Please try logging in again.'
          );
          spinnerFail();
          return;
        }
        if (
          error.response?.data.error &&
          !['authorization_pending', 'slow_down'].includes(error!.response.data.error)
        ) {
          logger.debug(error);
          spinnerFail();
          return;
        }
        // Await interval before retrying
        await new Promise((resolve) => {
          setTimeout(resolve, deviceAuthResponse.data.interval * 1000);
        });
      }
    }
    spinner.succeed('Authentication successful!');
    logger.log('You are now logged in to Strapi Cloud.');
  };

  await authenticate();
};
