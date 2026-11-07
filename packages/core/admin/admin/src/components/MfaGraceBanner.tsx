import * as React from 'react';

import { Box, Flex, Link, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useLocation } from 'react-router-dom';

import { useGetMfaStatusQuery } from '../services/mfa';
import { MFA_DATE_TIME_FORMAT } from '../utils/mfaDates';
import { isMfaNotFoundError } from '../utils/mfaFeature';

/** Re-read every 15 minutes so a long-lived tab notices a grace period stamped by a background token refresh. */
export const MFA_STATUS_POLL_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Non-dismissible warning shown while `/admin/mfa/me` reports `required && !enabled`: this
 * account must enrol before `graceUntil` or lose password login. A `Box` rather than the design
 * system `Alert`, because `Alert` always renders a close button and this must stay put.
 *
 * `graceUntil` can be `null` while `required` is true -- the session predates the requirement,
 * since the clock starts at the first session issued after it applies -- so the copy then points
 * at the next login rather than inventing a deadline.
 *
 * Polling and focus refetch stop on a 404 (the server's kill switch) and resume on a success. The
 * flag moves both ways because `/admin/mfa/me` is a cache entry other components also refresh.
 */
const MfaGraceBanner = () => {
  const { formatMessage, formatDate } = useIntl();
  // On the profile page the link would point at the page the user is on, and the setup button is
  // already in front of them, so it is left out there.
  const { pathname } = useLocation();
  const onProfilePage = pathname === '/me';
  const [isFeatureOff, setIsFeatureOff] = React.useState(false);
  const { data, error, refetch } = useGetMfaStatusQuery(undefined, {
    pollingInterval: isFeatureOff ? 0 : MFA_STATUS_POLL_INTERVAL_MS,
  });

  // A local focus listener rather than RTK's `refetchOnFocus`, which needs store-wide listeners.
  React.useEffect(() => {
    if (isFeatureOff) {
      return;
    }
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isFeatureOff, refetch]);

  React.useEffect(() => {
    const notFound = isMfaNotFoundError(error);
    if (notFound !== isFeatureOff) {
      setIsFeatureOff(notFound);
    }
  }, [error, isFeatureOff]);

  if (!data || !data.required || data.enabled) {
    return null;
  }

  return (
    <Box paddingTop={4} paddingLeft={6} paddingRight={6}>
      <Flex
        role="status"
        background="warning100"
        borderColor="warning200"
        hasRadius
        padding={4}
        gap={3}
        alignItems="flex-start"
      >
        <Box shrink={0} paddingTop={1}>
          <WarningCircle fill="warning600" aria-hidden />
        </Box>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography fontWeight="bold" textColor="warning700" tag="p">
            {formatMessage({
              id: 'Settings.profile.form.section.mfa.grace.title',
              defaultMessage: 'Two-factor authentication required',
            })}
          </Typography>
          <Typography textColor="warning700" tag="p">
            {data.graceUntil
              ? formatMessage(
                  {
                    id: 'Settings.profile.form.section.mfa.grace.deadline',
                    defaultMessage:
                      'Set up two-factor authentication before {datetime}, or your account will be locked.',
                  },
                  {
                    datetime: formatDate(data.graceUntil, MFA_DATE_TIME_FORMAT),
                  }
                )
              : formatMessage({
                  id: 'Settings.profile.form.section.mfa.grace.pending',
                  defaultMessage:
                    'Two-factor authentication is now required for your account. Your grace period to set it up starts at your next login.',
                })}
          </Typography>
          {onProfilePage ? null : (
            <Link tag={NavLink} to="/me" isExternal={false}>
              {formatMessage({
                id: 'Settings.profile.form.section.mfa.grace.action',
                defaultMessage: 'Set up two-factor authentication',
              })}
            </Link>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export { MfaGraceBanner };
