import * as React from 'react';

import { type IntlFormatters, useIntl } from 'react-intl';

import { useGetMfaNoticesQuery, useMarkMfaNoticesSeenMutation } from '../services/mfa';

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
};

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
  `${formatMessage(NOTICE_COPY[notice.type])} (${formatDate(notice.createdAt, {
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
 * Stays silent while loading, when the future flag is off (a 404 from `/admin/mfa/notices`, same
 * signal `TwoFactorSection` uses for `/admin/mfa/me`), and when there are no unseen notices.
 *
 * `announced` caps this at one toast per mount: RTK Query caches `getMfaNotices`, so it does not
 * refire on every route change, but a later refetch -- e.g. the `MfaNotices` tag invalidation that
 * follows `markMfaNoticesSeen` -- hands back a new array reference for `notices`, which would
 * otherwise re-run the effect below and toast again for events already dismissed.
 */
const MfaNotices = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { data: notices } = useGetMfaNoticesQuery();
  const [markSeen] = useMarkMfaNoticesSeenMutation();
  const announced = React.useRef(false);

  React.useEffect(() => {
    if (announced.current || !notices || notices.length === 0) {
      return;
    }
    announced.current = true;
    const ids = notices.map((notice) => Number(notice.id));

    toggleNotification({
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

  return null;
};

export { MfaNotices };
