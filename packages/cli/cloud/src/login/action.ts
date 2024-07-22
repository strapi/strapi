import axios, { AxiosResponse, AxiosError } from 'axios';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { tokenServiceFactory, cloudApiFactory } from '../services';
import type { CloudCliConfig, CLIContext } from '../types';
import { apiConfig } from '../config/api';
import { trackEvent } from '../utils/analytics';

const openModule = import('open');

export async function promptLogin(ctx: CLIContext) {
  const response = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'login',
      message: 'Would you like to login?',
    },
  ]);

  if (response.login) {
    const loginSuccessful = await loginAction(ctx);
    return loginSuccessful;
  }
  return false;
}

export default async function loginAction(ctx: CLIContext): Promise<boolean> {
  const { logger } = ctx;
  const tokenService = await tokenServiceFactory(ctx);
  const existingToken = await tokenService.retrieveToken();
  const cloudApiService = await cloudApiFactory(ctx, existingToken || undefined);

  if (existingToken) {
    const isTokenValid = await tokenService.isTokenValid(existingToken);
    if (isTokenValid) {
      try {
        const userInfo = await cloudApiService.getUserInfo();
        const { email } = userInfo.data.data;
        if (email) {
          logger.log(`You are already logged into your account (${email}).`);
        } else {
          logger.log('You are already logged in.');
        }
        logger.log(
          'To access your dashboard, please copy and paste the following URL into your web browser:'
        );
        logger.log(chalk.underline(`${apiConfig.dashboardBaseUrl}/projects`));
        return true;
      } catch (e) {
        logger.debug('Failed to fetch user info', e);
      }
    }
  }

  let cliConfig: CloudCliConfig;
  try {
    logger.info('🔌 Connecting to the Strapi Cloud API...');
    const config = await cloudApiService.config();
    cliConfig = config.data;
  } catch (e: unknown) {
    logger.error('🥲 Oops! Something went wrong while logging you in. Please try again.');
    logger.debug(e);
    return false;
  }
  await trackEvent(ctx, cloudApiService, 'willLoginAttempt', {});

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
    .catch((e: AxiosError) => {
      logger.error('There was an issue with the authentication process. Please try again.');
      if (e.message) {
        logger.debug(e.message, e);
      } else {
        logger.debug(e);
      }
    })) as AxiosResponse;

  openModule.then((open) => {
    open.default(deviceAuthResponse.data.verification_uri_complete).catch((e: Error) => {
      logger.error('We encountered an issue opening the browser. Please try again later.');
      logger.debug(e.message, e);
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
          } catch (e: any) {
            logger.debug(e);
            spinnerFail();
            throw new Error('Unable to proceed: Token validation failed');
          }

          logger.debug('🔍 Fetching user information...');
          const cloudApiServiceWithToken = await cloudApiFactory(ctx, authTokenData.access_token);
          // Call to get user info to create the user in DB if not exists
          await cloudApiServiceWithToken.getUserInfo();
          logger.debug('🔍 User information fetched successfully!');

          try {
            logger.debug('📝 Saving login information...');
            await tokenService.saveToken(authTokenData.access_token);
            logger.debug('📝 Login information saved successfully!');
            isAuthenticated = true;
          } catch (e) {
            logger.error(
              'There was a problem saving your login information. Please try logging in again.'
            );
            logger.debug(e);
            spinnerFail();
            return false;
          }
        }
      } catch (e: any) {
        if (e.message === 'Unable to proceed: Token validation failed') {
          logger.error(
            'There seems to be a problem with your login information. Please try logging in again.'
          );
          spinnerFail();
          await trackEvent(ctx, cloudApiService, 'didNotLogin', { loginMethod: 'cli' });
          return false;
        }
        if (
          e.response?.data.error &&
          !['authorization_pending', 'slow_down'].includes(e!.response.data.error)
        ) {
          logger.debug(e);
          spinnerFail();
          await trackEvent(ctx, cloudApiService, 'didNotLogin', { loginMethod: 'cli' });
          return false;
        }
        // Await interval before retrying
        await new Promise((resolve) => {
          setTimeout(resolve, deviceAuthResponse.data.interval * 1000);
        });
      }
    }
    spinner.succeed('Authentication successful!');
    logger.log('You are now logged into Strapi Cloud.');
    logger.log(
      'To access your dashboard, please copy and paste the following URL into your web browser:'
    );
    logger.log(chalk.underline(`${apiConfig.dashboardBaseUrl}/projects`));
    await trackEvent(ctx, cloudApiService, 'didLogin', { loginMethod: 'cli' });
  };

  await authenticate();
  return isAuthenticated;
}
