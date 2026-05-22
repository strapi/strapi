import { cloudApiFactory, tokenServiceFactory } from '../services';
import { getContext } from '../services/context';
import { createLogger } from '../services/logger';
import { trackEvent } from '../utils/analytics';

interface CreateGrowthSsoTrialInput {
  strapiVersion: string | undefined;
}

interface CreateGrowthSsoTrialResponse {
  license: string;
}

export default async ({
  strapiVersion,
}: CreateGrowthSsoTrialInput): Promise<CreateGrowthSsoTrialResponse | undefined> => {
  const logger = createLogger();
  const { retrieveToken } = await tokenServiceFactory({ logger });

  const token = await retrieveToken();
  if (!token) {
    return;
  }

  const cloudApiService = await cloudApiFactory({ logger }, token);

  try {
    const { data: config } = await cloudApiService.config();
    if (!config?.featureFlags?.growthSsoTrialEnabled) {
      return;
    }
  } catch (e: unknown) {
    logger.debug('Failed to get cli config', e);
    return;
  }

  try {
    const response = await cloudApiService.createTrial({ strapiVersion: strapiVersion || '' });

    const ctx = getContext();

    await trackEvent(ctx, cloudApiService, 'didCreateGrowthSsoTrial', {
      strapiVersion: strapiVersion || '',
    });

    return { license: response.data?.licenseKey };
  } catch (e: Error | unknown) {
    logger.debug(e);
    logger.error(
      'We encountered an issue while creating your trial. Please try again in a moment. If the problem persists, contact support for assistance.'
    );
  }
};
