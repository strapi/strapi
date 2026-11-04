import * as React from 'react';

import { Alert, Box, Link } from '@strapi/design-system';
import { type IntlFormatters, useIntl } from 'react-intl';
import { NavLink, useMatch } from 'react-router-dom';

import {
  useGetMfaNoticesQuery,
  useGetMfaStatusQuery,
  useMarkMfaNoticesSeenMutation,
} from '../services/mfa';
import { isNotFoundError } from '../utils/baseQuery';
import { MFA_DATE_TIME_FORMAT } from '../utils/mfaDates';

import type { MfaEventNotice } from '../../../shared/contracts/mfa';

/** One source of truth for what each event means. The next-login notice only needs the count. */
const NOTICE_COPY: Record<MfaEventNotice['type'], { id: string; defaultMessage: string }> = {
  enabled: {
    id: 'Settings.profile.form.section.mfa.notice.enabled',
    defaultMessage: 'Two-factor authentication was enabled',
  },
  disabled: {
    id: 'Settings.profile.form.section.mfa.notice.disabled',
    defaultMessage: 'Two-factor authentication was disabled',
  },
  reset: {
    id: 'Settings.profile.form.section.mfa.notice.reset',
    defaultMessage: 'Two-factor authentication was reset by an administrator',
  },
  challenge_failed: {
    id: 'Settings.profile.form.section.mfa.notice.challenge_failed',
    defaultMessage: 'A wrong two-factor code was entered for your account',
  },
  recovery_code_used: {
    id: 'Settings.profile.form.section.mfa.notice.recovery_code_used',
    defaultMessage: 'A recovery code was used to log in',
  },
  grace_started: {
    id: 'Settings.profile.form.section.mfa.notice.grace_started',
    defaultMessage: 'Two-factor authentication is now required for your account',
  },
  locked: {
    id: 'Settings.profile.form.section.mfa.notice.locked',
    defaultMessage:
      'Your account was locked because two-factor authentication was not set up in time',
  },
  unlocked: {
    id: 'Settings.profile.form.section.mfa.notice.unlocked',
    defaultMessage: 'Your account was unlocked by an administrator',
  },
  authenticator_replaced: {
    id: 'Settings.profile.form.section.mfa.notice.authenticator_replaced',
    defaultMessage: 'Your authenticator app was replaced',
  },
  device_trusted: {
    id: 'Settings.profile.form.section.mfa.notice.device_trusted',
    defaultMessage: 'A device was trusted to skip the two-factor code',
  },
  device_trust_revoked: {
    id: 'Settings.profile.form.section.mfa.notice.device_trust_revoked',
    defaultMessage: 'Trusted devices were revoked',
  },
  passkey_registered: {
    id: 'Settings.profile.form.section.mfa.notice.passkey_registered',
    defaultMessage: 'A passkey was added to your account',
  },
  passkey_removed: {
    id: 'Settings.profile.form.section.mfa.notice.passkey_removed',
    defaultMessage: 'A passkey was removed from your account',
  },
};

/** Chosen from the metadata rather than by a second event type: the server records one type for
 * both and keeps the distinction in `byUserId`. */
const REVOKED_BY_ADMIN_COPY = {
  id: 'Settings.profile.form.section.mfa.notice.device_trust_revoked.byAdmin',
  defaultMessage: 'Trusted devices were revoked by an administrator',
};

/** Used when the server could name the browser, instead of the generic copy. */
const DEVICE_TRUSTED_NAMED_COPY = {
  id: 'Settings.profile.form.section.mfa.notice.device_trusted.named',
  defaultMessage:
    'A device was trusted for {days, plural, one {# day} other {# days}}: {deviceName}',
};

interface NoticeCopy {
  descriptor: { id: string; defaultMessage: string };
  values?: Record<string, unknown>;
}

const copyFor = (notice: MfaEventNotice): NoticeCopy => {
  if (notice.type === 'device_trust_revoked' && typeof notice.metadata.byUserId === 'string') {
    return { descriptor: REVOKED_BY_ADMIN_COPY };
  }

  if (
    notice.type === 'device_trusted' &&
    typeof notice.metadata.deviceName === 'string' &&
    typeof notice.metadata.days === 'number'
  ) {
    return {
      descriptor: DEVICE_TRUSTED_NAMED_COPY,
      values: { days: notice.metadata.days, deviceName: notice.metadata.deviceName },
    };
  }

  return { descriptor: NOTICE_COPY[notice.type] };
};

export const formatMfaNotice = (
  notice: MfaEventNotice,
  formatMessage: IntlFormatters['formatMessage'],
  formatDate: IntlFormatters['formatDate']
): string => {
  const copy = copyFor(notice);
  // One message rather than a string template, so a translation can place the date and the
  // punctuation where its language wants them.
  return formatMessage(
    {
      id: 'Settings.profile.form.section.mfa.notice.withDate',
      defaultMessage: '{notice} ({datetime}).',
    },
    {
      notice: formatMessage(copy.descriptor, copy.values),
      datetime: formatDate(notice.createdAt, MFA_DATE_TIME_FORMAT),
    }
  );
};

const PROFILE_PATH = '/me';

/**
 * Unseen notice rows become one inline warning, rendered by the authenticated layout directly
 * under the two-factor grace banner (see `MfaBanners`), so the two can never overlap. Closing it
 * marks the announced notices seen. "profile page" in the message links to the profile.
 *
 * Never on the profile page itself, which lists the same events in its two-factor section with its
 * own "Mark all as seen": landing there (from the link or otherwise) hides the notice without
 * marking anything seen, and a visit there counts as announced, so leaving the page does not bring
 * the notice back.
 *
 * Mounted only in a build with the feature (`MfaBanners`). The kill-switch signal is a 404 from
 * `useGetMfaStatusQuery`, which then `skip`s the notices query.
 * Deliberately not `status.enabled`: `disabled`/`reset` notices are raised exactly when a user
 * stops being enrolled, so they must keep flowing for a not-currently-enrolled user.
 *
 * `announced` caps this at one notice per mount, because a refetch hands back a new array
 * reference and would otherwise raise it again for events already dismissed. An in-SPA logout
 * unmounts the layout and this with it, without marking anything seen.
 */
const MfaNotices = () => {
  const { formatMessage } = useIntl();
  const { error: statusError, isLoading: statusLoading } = useGetMfaStatusQuery();
  // Also true while the status query is in flight: dropping that half would fire the notices query
  // once against a feature that may turn out to be off.
  const skipNotices = isNotFoundError(statusError) || statusLoading;
  const { data: notices } = useGetMfaNoticesQuery(undefined, { skip: skipNotices });
  const [markSeen] = useMarkMfaNoticesSeenMutation();
  const announced = React.useRef(false);
  const [shown, setShown] = React.useState<MfaEventNotice[] | null>(null);
  const onProfile = useMatch(PROFILE_PATH) !== null;

  React.useEffect(() => {
    if (onProfile) {
      if (notices && notices.length > 0) {
        announced.current = true;
      }
      setShown(null);
      return;
    }
    if (announced.current || !notices || notices.length === 0) {
      return;
    }
    announced.current = true;
    setShown(notices);
  }, [notices, onProfile]);

  if (!shown) {
    return null;
  }

  const handleClose = () => {
    markSeen({ ids: shown.map((notice) => Number(notice.id)) });
    setShown(null);
  };

  return (
    <Box paddingTop={4} paddingLeft={6} paddingRight={6} data-testid="mfa-security-notice">
      <Alert
        variant="warning"
        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
        title={formatMessage({
          id: 'Settings.profile.form.section.mfa.notice.title',
          defaultMessage: 'Security notice',
        })}
        onClose={handleClose}
      >
        {formatMessage(
          {
            id: 'Settings.profile.form.section.mfa.notice.summary',
            defaultMessage:
              '{count, plural, one {# security event} other {# security events}} on your account since your last visit. Review them on your <link>profile page</link>.',
          },
          {
            count: shown.length,
            link: (chunks: React.ReactNode) => (
              <Link tag={NavLink} to={PROFILE_PATH} isExternal={false}>
                {chunks}
              </Link>
            ),
          }
        )}
      </Alert>
    </Box>
  );
};

export { MfaNotices };
