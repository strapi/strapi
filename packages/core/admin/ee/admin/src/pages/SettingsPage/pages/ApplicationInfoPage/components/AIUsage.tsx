import { Flex, Typography, Grid, ProgressBar } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useQueryParams } from '../../../../../../../../admin/src/hooks/useQueryParams';
import { useGetAIUsageQuery } from '../../../../../services/ai';

export const AIUsage = () => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams();
  const { data, isLoading, error } = useGetAIUsageQuery(
    {
      ...query,
    },
    {
      refetchOnMountOrArgChange: true,
    }
  );

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
  const overage = usedCredits - totalCredits;
  const percentRemaining = (usedCredits / totalCredits) * 100;
  const percentOverage = (usedCredits / maxCredits) * 100;

  const isInOverages = overage > 0 && maxCredits !== totalCredits;

  return (
    <Grid.Item col={6} s={12} direction="column" alignItems="start" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.ai-usage',
          defaultMessage: 'AI Usage',
        })}
      </Typography>
      <Flex gap={2} direction="column" alignItems="flex-start">
        {!isInOverages && (
          <>
            <Flex>
              <ProgressBar value={percentRemaining} size="M" />
            </Flex>
            <Typography variant="omega">
              {`${usedCredits} credits used from ${totalCredits} credits available in your plan`}
            </Typography>
          </>
        )}
        {isInOverages && (
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
