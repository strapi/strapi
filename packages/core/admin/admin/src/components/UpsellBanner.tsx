import { useEffect } from 'react';

import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { Box, Flex, LinkButton, Typography } from '@strapi/design-system';
import { isAfter, subDays } from 'date-fns';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetLicenseTrialTimeLeftQuery } from '../../src/services/admin';
import { RESPONSIVE_DEFAULT_SPACING } from '../constants/theme';
import { useScopedPersistentState } from '../hooks/usePersistentState';

const BannerBackground = styled(Flex)`
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.primary600} 0%,
    ${({ theme }) => theme.colors.alternative600} 121.48%
  );
`;

const Banner = ({ isTrialEndedRecently }: { isTrialEndedRecently: boolean }) => {
  const { formatMessage } = useIntl();

  return (
    <BannerBackground width="100%" justifyContent="center">
      <Flex
        justifyContent="center"
        alignItems="center"
        width="100%"
        paddingTop={2}
        paddingBottom={2}
        paddingLeft={RESPONSIVE_DEFAULT_SPACING}
        paddingRight={RESPONSIVE_DEFAULT_SPACING}
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
              isTrialEndedRecently
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
              isTrialEndedRecently
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
              isTrialEndedRecently
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

const UpsellBanner = () => {
  const { license } = useLicenseLimits();

  const [cachedTrialEndsAt, setCachedTrialEndsAt] = useScopedPersistentState<string | undefined>(
    'STRAPI_FREE_TRIAL_ENDS_AT',
    undefined
  );

  const sevenDaysAgo = subDays(new Date(), 7);

  const timeLeftData = useGetLicenseTrialTimeLeftQuery(undefined, {
    skip: !license?.isTrial,
  });

  useEffect(() => {
    if (timeLeftData.data?.trialEndsAt) {
      setCachedTrialEndsAt(timeLeftData.data.trialEndsAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftData.data?.trialEndsAt]);

  // When the license is not a trial + not EE, and the cached trial end date is found in the localstorage, that means the trial has ended
  // We show the banner to encourage the user to upgrade (for 7 days after the trial ends)
  const isTrialEndedRecently = Boolean(
    !license?.isTrial &&
      !window.strapi.isEE &&
      cachedTrialEndsAt &&
      isAfter(new Date(cachedTrialEndsAt), sevenDaysAgo)
  );

  if (timeLeftData.data?.trialEndsAt || isTrialEndedRecently) {
    return <Banner isTrialEndedRecently={isTrialEndedRecently} />;
  }

  return null;
};

export { UpsellBanner };
