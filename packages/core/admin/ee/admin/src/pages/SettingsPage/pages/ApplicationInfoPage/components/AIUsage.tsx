import { Flex, Typography, ProgressBar } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetAiUsageQuery } from '../../../../../services/ai';

/**
 * The fill colour has to come from a transient prop. `ProgressBar` forwards unknown props onto
 * the underlying Radix div, so the `color="danger"` this used to be given was landing as an HTML
 * `color` attribute and never reaching the fill — the overage bar rendered neutral, not red.
 */
const StyledProgressBar = styled(ProgressBar)<{ $variant?: 'neutral' | 'danger' }>`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.neutral200};
  > div {
    background-color: ${({ theme, $variant }) =>
      $variant === 'danger' ? theme.colors.danger600 : theme.colors.neutral700};
  }
`;

interface AIUsageProps {
  /** Trials are not billed for overages, so the rate line is meaningless to them. */
  isTrial?: boolean;
}

export const AIUsage = ({ isTrial = false }: AIUsageProps) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, error } = useGetAiUsageQuery(undefined, {
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
    <Flex direction="column" alignItems="start" gap={2}>
      <Typography variant="sigma" textColor="neutral600">
        {formatMessage({
          id: 'Settings.application.ai-usage',
          defaultMessage: 'AI Usage',
        })}
      </Typography>
      <Flex gap={2} direction="column" alignItems="flex-start">
        {!isInOverages && (
          <>
            <Flex direction="row" alignItems="baseline" gap={1}>
              <Typography>{`${usedCredits.toFixed(2)}`}</Typography>
              <Typography variant="pi" textColor="neutral600">{`/ ${totalCredits}`}</Typography>
            </Flex>
            <Flex width="100%">
              {/* The "12.00 / 100" pair above is only meaningful next to the bar, so the bar
                  carries the full sentence for screen readers. */}
              <StyledProgressBar
                value={percentRemaining}
                size="M"
                aria-label={`${usedCredits.toFixed(2)} credits used from ${totalCredits} credits available in your plan`}
              />
            </Flex>
          </>
        )}
        {isInOverages && (
          <>
            <Flex direction="row" alignItems="baseline" gap={1}>
              <Typography variant="epsilon" textColor="danger600">
                {`${overage.toFixed(2)}`}
              </Typography>
              <Typography variant="pi" textColor="neutral600">{`/ ${totalCredits}`}</Typography>
            </Flex>
            <Flex width="100%">
              <StyledProgressBar
                value={percentOverage}
                size="M"
                $variant="danger"
                aria-label={`${overage.toFixed(2)} credits used above the ${totalCredits} credits available in your plan`}
              />
            </Flex>
          </>
        )}
        {!isTrial && (
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: 'Settings.application.ai-usage.overage-rate',
              defaultMessage: '+$1.50 per 100 credits above plan limit',
            })}
          </Typography>
        )}
      </Flex>
    </Flex>
  );
};
