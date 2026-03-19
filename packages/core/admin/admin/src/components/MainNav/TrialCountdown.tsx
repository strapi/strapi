import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { Flex, Tooltip } from '@strapi/design-system';
import { format, isBefore, startOfToday } from 'date-fns';
import { useIntl } from 'react-intl';
import { styled, useTheme } from 'styled-components';

import { useGetLicenseTrialTimeLeftQuery } from '../../../src/services/admin';

type CircleProgressBarProps = {
  percentage: number;
};

const CircleProgressBar = ({ percentage }: CircleProgressBarProps) => {
  const theme = useTheme();

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
    <svg width="32" height="32" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={theme.colors.primary600} />
          <stop offset="100%" stopColor={theme.colors.alternative600} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={radius} stroke="#ccc" strokeWidth="10" fill="none" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        stroke="url(#progressGradient)"
        strokeWidth="10"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        strokeLinecap="round"
      />
      <svg x="35" y="25" width="50" height="50" viewBox="0 0 32 32">
        <path
          fill="url(#progressGradient)"
          d="m21.731 14.683-14 15a1 1 0 0 1-1.711-.875l1.832-9.167L.65 16.936a1 1 0 0 1-.375-1.625l14-15a1 1 0 0 1 1.71.875l-1.837 9.177 7.204 2.7a1 1 0 0 1 .375 1.62z"
        />
      </svg>
    </svg>
  );
};

const Container = styled(Flex)`
  display: none;

  ${({ theme }) => theme.breakpoints.large} {
    display: flex;
  }
`;

const TrialCountdown = () => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();

  const timeLeftData = useGetLicenseTrialTimeLeftQuery(undefined, {
    skip: !license?.isTrial,
  });

  if (
    isError ||
    isLoading ||
    !license?.isTrial ||
    timeLeftData.isLoading ||
    timeLeftData.isError ||
    !timeLeftData.data ||
    !timeLeftData.data.trialEndsAt
  ) {
    return null;
  }

  const targetDate = new Date(timeLeftData.data.trialEndsAt);
  const now = new Date();
  const isTargetDateInPast = isBefore(targetDate, startOfToday());

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const timeDifference = targetDate.getTime() - now.getTime();

  const daysLeft =
    Math.ceil(timeDifference / millisecondsPerDay) <= 0
      ? 0
      : Math.ceil(timeDifference / millisecondsPerDay);

  return (
    <Container justifyContent="center" padding={3}>
      <Tooltip
        label={formatMessage(
          isTargetDateInPast
            ? {
                id: 'app.components.LeftMenu.trialCountdown.endedAt',
                defaultMessage: 'Your trial ended on {date}',
              }
            : {
                id: 'app.components.LeftMenu.trialCountdown.endsAt',
                defaultMessage: 'Your trial ends on {date}',
              },
          {
            date: format(new Date(timeLeftData.data.trialEndsAt), 'PPP'),
          }
        )}
        side="right"
      >
        <div data-testid="trial-countdown">
          <CircleProgressBar percentage={((30 - daysLeft) * 100) / 30} />
        </div>
      </Tooltip>
    </Container>
  );
};

export { TrialCountdown };
