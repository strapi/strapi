import * as React from 'react';

import { type IntlFormatters, useIntl } from 'react-intl';

import {
  useGetMfaNoticesQuery,
  useGetMfaStatusQuery,
  useMarkMfaNoticesSeenMutation,
} from '../services/mfa';
import { isNotFoundError } from '../utils/baseQuery';

import { useNotification } from './Notifications';

import type { MfaEventNotice } from '../../../shared/contracts/mfa';

/** One source of truth for what each event means. The next-login toast only needs the count. */
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
  return `${formatMessage(copy.descriptor, copy.values)} (${formatDate(notice.createdAt, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })})`;
};

/**
 * Unseen notice rows become one warning toast on the next authenticated load. No link, because
 * `Notifications` renders `link` as an external `<Link isExternal>`, which is wrong for an in-app
 * destination.
 *
 * The flag-off signal is a 404 from `useGetMfaStatusQuery`, which then `skip`s the notices query.
 * Deliberately not `status.enabled`: `disabled`/`reset` notices are raised exactly when a user
 * stops being enrolled, so they must keep flowing for a not-currently-enrolled user.
 *
 * `announced` caps this at one toast per mount, because a refetch hands back a new array
 * reference and would otherwise toast again for events already dismissed.
 *
 * `Toaster` is rendered above the router while this lives inside `AdminLayout`, so an in-SPA
 * logout unmounts this and not the toast: without the cleanup effect the toast survives onto the
 * login screen. `toast.dismiss` does not run `onClose`, so that path deliberately does not mark
 * the notices seen -- the user never saw them.
 */
const MfaNotices = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification, dismissNotification } = useNotification();
  const { error: statusError, isLoading: statusLoading } = useGetMfaStatusQuery();
  // Also true while the status query is in flight: dropping that half would fire the notices query
  // once against a feature that may turn out to be off.
  const skipNotices = isNotFoundError(statusError) || statusLoading;
  const { data: notices } = useGetMfaNoticesQuery(undefined, { skip: skipNotices });
  const [markSeen] = useMarkMfaNoticesSeenMutation();
  const announced = React.useRef(false);
  const toastId = React.useRef<string | number>();

  React.useEffect(() => {
    if (announced.current || !notices || notices.length === 0) {
      return;
    }
    announced.current = true;
    const ids = notices.map((notice) => Number(notice.id));

    toastId.current = toggleNotification({
      type: 'warning',
      blockTransition: true,
      title: formatMessage({
        id: 'Settings.profile.form.section.mfa.notice.title',
        defaultMessage: 'Security notice',
      }),
      message: formatMessage(
        {
          id: 'Settings.profile.form.section.mfa.notice.summary',
          defaultMessage:
            '{count, plural, one {# security event} other {# security events}} on your account since your last visit. Review them on your profile page.',
        },
        { count: notices.length }
      ),
      onClose: () => {
        markSeen({ ids });
      },
    });
  }, [formatMessage, markSeen, notices, toggleNotification]);

  React.useEffect(() => {
    return () => {
      if (toastId.current !== undefined) {
        dismissNotification(toastId.current);
      }
    };
  }, [dismissNotification]);

  return null;
};

export { MfaNotices };
