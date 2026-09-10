import * as React from 'react';

import { Box, Flex, Link, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useGetMfaStatusQuery } from '../services/mfa';
import { isNotFoundError } from '../utils/baseQuery';

/** Re-read every 15 minutes so a long-lived tab notices a grace period stamped by a background token refresh. */
export const MFA_STATUS_POLL_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Non-dismissible warning shown at the top of the authenticated layout while `/admin/mfa/me`
 * reports `required && !enabled`: this account must enrol before `graceUntil` or it is locked
 * for password login. A `Box` rather than the design system `Alert` because `Alert` always
 * renders a close button, and this one must stay until the user enrols.
 *
 * `graceUntil` can be `null` while `required` is true: the session predates the requirement
 * (the grace clock starts at the first *session issue* after the requirement applies), so the
 * copy then says the deadline starts at the next login rather than inventing one.
 *
 * Polling and refetch-on-focus stop once the endpoint answers 404 (feature off): there is
 * nothing to watch, and a guaranteed 404 per interval on every default-off instance is pure
 * noise.
 *
 * The options passed to the hook can only depend on the *previous* render's result (the hook's
 * own return value isn't available yet while building its own argument), so "is a 404 the
 * current state" is tracked in state and mirrored off-by-one render behind via an effect rather
 * than read from the `error` this same call returns. This mirroring goes **both ways**: the
 * banner is mounted for the whole authenticated session, and `/admin/mfa/me` is a shared query
 * cache entry that `TwoFactorSection`, `SecurityPage` and `MfaNotices` also read, so any of them
 * (or this component, once the feature is turned back on) can land a successful response and
 * bring polling/refetch-on-focus back for everyone subscribed -- a one-way latch would mean a
 * single observed 404 permanently disables this banner's ability to notice a grace period for
 * the rest of the tab's life, even after an admin enables the requirement.
 */
const MfaGraceBanner = () => {
  const { formatMessage, formatDate } = useIntl();
  const [isFeatureOff, setIsFeatureOff] = React.useState(false);
  const { data, error } = useGetMfaStatusQuery(undefined, {
    pollingInterval: isFeatureOff ? 0 : MFA_STATUS_POLL_INTERVAL_MS,
    refetchOnFocus: !isFeatureOff,
  });

  React.useEffect(() => {
    const notFound = isNotFoundError(error);
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
                    datetime: formatDate(data.graceUntil, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  }
                )
              : formatMessage({
                  id: 'Settings.profile.form.section.mfa.grace.pending',
                  defaultMessage:
                    'Two-factor authentication is now required for your account. The deadline to set it up starts at your next login.',
                })}
          </Typography>
          <Link tag={NavLink} to="/me" isExternal={false}>
            {formatMessage({
              id: 'Settings.profile.form.section.mfa.grace.action',
              defaultMessage: 'Set up two-factor authentication',
            })}
          </Link>
        </Flex>
      </Flex>
    </Box>
  );
};

export { MfaGraceBanner };
