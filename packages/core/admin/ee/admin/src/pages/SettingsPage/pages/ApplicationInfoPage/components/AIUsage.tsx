import { Flex, Typography, Grid, ProgressBar } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetAIUsageQuery } from '../../../../../services/ai';

export const AIUsage = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetAIUsageQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return null;
  }

  if (error || !data) {
    return null;
  }
  if (!data.subscription?.cmsAiEnabled) {
    return null;
  }

  // Calculate remaining credits and total
  const totalCredits = data.subscription.cmsAiCreditsBase;
  const usedCredits = data.cmsAiCreditsUsed;
  const maxCredits = data.subscription.cmsAiCreditsMaxUsage;
  const remainingCredits = Math.max(totalCredits - usedCredits, 0);
  const overage = Math.max(usedCredits - totalCredits, 0);
  const percentRemaining = (remainingCredits / totalCredits) * 100;
  const percentOverage = (overage / totalCredits) * 100;

  return (
    <Grid.Item col={6} s={12} direction="column" alignItems="flex-start" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.ai-usage',
          defaultMessage: 'AI Usage',
        })}
      </Typography>
      <Flex gap={2} direction="column" alignItems="flex-start">
        {remainingCredits > 0 && (
          <>
            <Flex>
              <ProgressBar value={percentRemaining} size="M" />
            </Flex>
            <Typography variant="omega">
              {`${remainingCredits} credits remaining on ${totalCredits}`}
            </Typography>
          </>
        )}
        {overage > 0 && (
          <>
            <Flex>
              <ProgressBar value={percentOverage} size="M" color="danger" />
            </Flex>
            <Typography variant="omega" textColor="danger600">
              {`${overage} credits used above the ${totalCredits} credits available in your plan`}
            </Typography>
          </>
        )}
      </Flex>
    </Grid.Item>
  );
};
