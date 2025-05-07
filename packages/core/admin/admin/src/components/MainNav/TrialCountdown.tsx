import React from 'react';

import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { Flex, Tooltip } from '@strapi/design-system';
import { format } from 'date-fns';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';

import { useGetTrialCountdownQuery } from '../../../src/services/license';

type CircleProgressBarProps = {
  percentage: number;
};

const CircleProgressBar: React.FC<CircleProgressBarProps> = ({ percentage }) => {
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

const TrialCountdown = () => {
  const { formatMessage } = useIntl();
  const { license, isError, isLoading } = useLicenseLimits();

  const { data } = useGetTrialCountdownQuery({
    // TODO: get licenseId dynamically
    id: '00902332-43ef-442b-91ce-a765d150fb89',
  });

  if (isError || isLoading || !license?.isTrial || !data) {
    return null;
  }

  return (
    <Flex justifyContent="center" padding={3}>
      <Tooltip
        label={formatMessage(
          {
            id: 'app.components.LeftMenu.trialCountdown',
            defaultMessage: 'Your trial ends on {date}',
          },
          {
            date: format(new Date(data.trialEndsAt), 'PPP'),
          }
        )}
        side="right"
      >
        <div>
          <CircleProgressBar percentage={((30 - data.daysLeft) * 100) / 30} />
        </div>
      </Tooltip>
    </Flex>
  );
};

export { TrialCountdown };
