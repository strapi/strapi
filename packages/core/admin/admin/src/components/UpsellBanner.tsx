import { useEffect } from 'react';

import { useLicenseLimits } from '@strapi/admin/strapi-admin/ee';
import { Flex, IconButton, LinkButton, Typography } from '@strapi/design-system';
import { ChevronUp } from '@strapi/icons';
import { isAfter, isValid, subDays } from 'date-fns';
import { useIntl } from 'react-intl';

import { useGetLicenseTrialTimeLeftQuery } from '../../src/services/admin';
import { RESPONSIVE_DEFAULT_SPACING } from '../constants/theme';
import { useScopedPersistentState } from '../hooks/usePersistentState';

import { DismissibleBanner } from './DismissibleBanner';

const Banner = ({
  isTrialEndedRecently,
  onDismiss,
}: {
  isTrialEndedRecently: boolean;
  onDismiss: () => void;
}) => {
  const { formatMessage } = useIntl();

  return (
    <DismissibleBanner
      onDismiss={onDismiss}
      closeLabel={formatMessage({
        id: 'app.components.UpsellBanner.close',
        defaultMessage: 'Close',
      })}
      message={
        <>
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
        </>
      }
      action={
        <LinkButton
          width="max-content"
          variant="tertiary"
          href="https://billing.strapi.io"
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
      }
    />
  );
};

const UpsellBanner = () => {
  const { license } = useLicenseLimits();
  const { formatMessage } = useIntl();

  const [cachedTrialEndsAt, setCachedTrialEndsAt] = useScopedPersistentState<string | undefined>(
    'STRAPI_FREE_TRIAL_ENDS_AT',
    undefined
  );

  const [dismissedFor, setDismissedFor] = useScopedPersistentState<string | undefined>(
    'STRAPI_UPSELL_BANNER_DISMISSED_FOR',
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

  const trialEndsAt = timeLeftData.data?.trialEndsAt ?? cachedTrialEndsAt;

  const toCanonicalISO = (v: string | undefined): string | undefined => {
    if (!v) return undefined;
    const date = new Date(v);
    return isValid(date) ? date.toISOString() : undefined;
  };

  const isDismissed = Boolean(
    trialEndsAt && toCanonicalISO(dismissedFor) === toCanonicalISO(trialEndsAt)
  );

  const handleDismiss = () => setDismissedFor(toCanonicalISO(trialEndsAt));
  const handleReopen = () => setDismissedFor(undefined);

  if (!(timeLeftData.data?.trialEndsAt || isTrialEndedRecently)) {
    return null;
  }

  if (isDismissed) {
    return (
      <Flex
        justifyContent="flex-end"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={RESPONSIVE_DEFAULT_SPACING}
        paddingRight={RESPONSIVE_DEFAULT_SPACING}
      >
        <IconButton
          variant="ghost"
          withTooltip={false}
          label={formatMessage({
            id: 'app.components.UpsellBanner.reopen',
            defaultMessage: 'Reopen banner',
          })}
          onClick={handleReopen}
        >
          <ChevronUp />
        </IconButton>
      </Flex>
    );
  }

  return <Banner isTrialEndedRecently={isTrialEndedRecently} onDismiss={handleDismiss} />;
};

export { UpsellBanner };
