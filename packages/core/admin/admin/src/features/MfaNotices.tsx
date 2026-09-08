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

/**
 * Copy for every `admin::mfa-event` type the server can raise a notice about. Keyed by
 * `notice.type` so the profile section's list (via `formatMfaNotice`) has one source of truth for
 * what each event means; the next-login toast only needs the count, not this table.
 */
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
  trusted_device_used: {
    id: 'Settings.profile.form.section.mfa.notice.trusted_device_used',
    defaultMessage: 'A trusted device logged in without a code',
  },
};

/**
 * `device_trust_revoked` carries `byUserId` when an administrator did it (cycle 3), and the
 * notice should say so. Chosen here from the metadata rather than by a fourth event type: the
 * server records one type for both and keeps the distinction in the event's metadata.
 */
const REVOKED_BY_ADMIN_COPY = {
  id: 'Settings.profile.form.section.mfa.notice.device_trust_revoked.byAdmin',
  defaultMessage: 'Trusted devices were revoked by an administrator',
};

const copyFor = (notice: MfaEventNotice) =>
  notice.type === 'device_trust_revoked' && typeof notice.metadata.byUserId === 'string'
    ? REVOKED_BY_ADMIN_COPY
    : NOTICE_COPY[notice.type];

/**
 * Renders one notice as `"<copy> (<date>)"`, e.g. "A recovery code was used to log in (Sep 1,
 * 2026, 11:00 AM)". Shared by the profile section's "Recent security events" list; the next-login
 * toast only needs a count, so it does not call this.
 */
export const formatMfaNotice = (
  notice: MfaEventNotice,
  formatMessage: IntlFormatters['formatMessage'],
  formatDate: IntlFormatters['formatDate']
): string =>
  `${formatMessage(copyFor(notice))} (${formatDate(notice.createdAt, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })})`;

/**
 * The spec's primary notification channel: unseen `admin::mfa-event` rows become one warning
 * toast on the next authenticated load. There is deliberately no link -- `Notifications` renders
 * `link` as an external `<Link isExternal>` (new tab / full navigation), which is wrong for an
 * in-app destination -- so the message just says where to look. Dismissing the toast marks
 * exactly those rows seen; the profile section (`TwoFactorSection`) lists the same notices, so
 * nothing is lost if the toast is left to sit or times out.
 *
 * Stays silent while loading, when the future flag is off, and when there are no unseen notices.
 * The flag-off signal is a 404 from `useGetMfaStatusQuery` (`/admin/mfa/me`) -- the same query
 * `TwoFactorSection` already runs and RTK Query caches, so checking it here costs no extra
 * request -- which then `skip`s `useGetMfaNoticesQuery` entirely. This deliberately does NOT
 * factor in `status.enabled`: `disabled`/`reset` notices are raised exactly when a user stops
 * being enrolled, so notices must keep flowing for a not-currently-enrolled user too.
 *
 * `announced` caps this at one toast per mount: RTK Query caches `getMfaNotices`, so it does not
 * refire on every route change, but a later refetch -- e.g. the `MfaNotices` tag invalidation that
 * follows `markMfaNoticesSeen` -- hands back a new array reference for `notices`, which would
 * otherwise re-run the effect below and toast again for events already dismissed.
 *
 * The toast is `blockTransition: true` (`duration: Infinity`), and `Toaster` is rendered once for
 * the whole app, above the router -- while this component lives inside `AdminLayout`, below it. An
 * in-SPA logout unmounts `AdminLayout` (and this component) without ever unmounting `Toaster`, so
 * without the cleanup effect below the toast would survive on the login screen, and a fresh one
 * would stack on top of it after the next login. `toast.dismiss` does not run the `Alert`'s
 * `onClose`, so unmounting this way deliberately does NOT mark the notices seen -- the user never
 * actually saw them.
 */
const MfaNotices = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification, dismissNotification } = useNotification();
  const { error: statusError, isLoading: statusLoading } = useGetMfaStatusQuery();
  const statusIsNotFound = isNotFoundError(statusError) || statusLoading;
  const { data: notices } = useGetMfaNoticesQuery(undefined, { skip: statusIsNotFound });
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
