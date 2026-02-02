import { Flex, Typography, Grid, ProgressBar } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetAIUsageQuery } from '../../../../../services/ai';

const StyledProgressBar = styled(ProgressBar)`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.neutral200};
  > div {
    background-color: ${({ theme }) => theme.colors.neutral700};
  }
`;

const StyledGridItem = styled(Grid.Item)`
  ${({ theme }) => theme.breakpoints.large} {
    grid-column: 7 / 13;
  }
`;

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
  const overage = usedCredits - totalCredits;
  const percentRemaining = (usedCredits / totalCredits) * 100;
  const percentOverage = (usedCredits / maxCredits) * 100;

  const isInOverages = overage > 0 && maxCredits !== totalCredits;

  return (
    <StyledGridItem col={6} s={12} direction="column" alignItems="start" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.ai-usage',
          defaultMessage: 'AI Usage',
        })}
      </Typography>
      <Flex gap={2} direction="column" alignItems="flex-start">
        {!isInOverages && (
          <>
            <Flex width="100%">
              <StyledProgressBar value={percentRemaining} size="M" />
            </Flex>
            <Typography variant="omega">
              {`${usedCredits.toFixed(2)} credits used from ${totalCredits} credits available in your plan`}
            </Typography>
          </>
        )}
        {isInOverages && (
          <>
            <Flex width="100%">
              <StyledProgressBar value={percentOverage} size="M" color="danger" />
            </Flex>
            <Typography variant="omega" textColor="danger600">
              {`${overage.toFixed(2)} credits used above the ${totalCredits} credits available in your plan`}
            </Typography>
          </>
        )}
      </Flex>
    </StyledGridItem>
  );
};
