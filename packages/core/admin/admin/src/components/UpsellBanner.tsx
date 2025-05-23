import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { Box, Flex, LinkButton, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetLicenseTrialTimeLeftQuery } from '../../src/services/admin';

const BannerBackground = styled(Flex)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.primary600} 0%,
    ${({ theme }) => theme.colors.alternative600} 121.48%
  );
`;

const UpsellBanner = () => {
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

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const timeDifference = targetDate.getTime() - now.getTime();

  const daysLeft = Math.ceil(timeDifference / millisecondsPerDay);

  return (
    <BannerBackground width="100%" justifyContent="center">
      <Flex
        justifyContent="center"
        alignItems="center"
        width="100%"
        paddingTop={2}
        paddingBottom={2}
        paddingLeft={10}
        paddingRight={10}
        gap={2}
      >
        <Box>
          <Typography
            variant="delta"
            fontWeight="bold"
            textColor="neutral0"
            textAlign="center"
            fontSize={2}
          >
            {formatMessage(
              daysLeft <= 0
                ? {
                    id: 'app.components.UpsellBanner.intro.ended',
                    defaultMessage: 'Your trial has ended: ',
                  }
                : {
                    id: 'app.components.UpsellBanner.intro',
                    defaultMessage: 'Access to Growth plan features: ',
                  }
            )}
          </Typography>
          <Typography
            variant="delta"
            textColor="neutral0"
            textAlign="center"
            paddingRight={4}
            fontSize={2}
          >
            {formatMessage(
              daysLeft <= 0
                ? {
                    id: 'app.components.UpsellBanner.text.ended',
                    defaultMessage: 'Keep access to Growth features by upgrading now.',
                  }
                : {
                    id: 'app.components.UpsellBanner.text',
                    defaultMessage:
                      'As part of your trial, you can explore premium tools such as Content History, Releases, and Single Sign-On (SSO).',
                  }
            )}
          </Typography>
        </Box>
        <Box>
          <LinkButton
            width="max-content"
            variant="tertiary"
            href="https://strapi.chargebeeportal.com"
            target="_blank"
          >
            {formatMessage(
              daysLeft <= 0
                ? {
                    id: 'app.components.UpsellBanner.button.ended',
                    defaultMessage: 'Keep Growth plan',
                  }
                : {
                    id: 'app.components.UpsellBanner.button',
                    defaultMessage: 'Upgrade now',
                  }
            )}
          </LinkButton>
        </Box>
      </Flex>
    </BannerBackground>
  );
};

export { UpsellBanner };
