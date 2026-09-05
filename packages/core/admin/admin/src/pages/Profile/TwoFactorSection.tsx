import * as React from 'react';

import { Alert, Button, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { formatMfaNotice } from '../../features/MfaNotices';
import {
  useGetMfaNoticesQuery,
  useGetMfaStatusQuery,
  useMarkMfaNoticesSeenMutation,
} from '../../services/mfa';
import { isNotFoundError } from '../../utils/baseQuery';

import { EnrolDialog } from './EnrolDialog';
import { Panel } from './Panel';
import { ReAuthDialog } from './ReAuthDialog';

import type { Me, MfaEventNotice } from '../../../../shared/contracts/mfa';

/** Below this many unused recovery codes the section nags; matches the spec's low-codes warning. */
export const LOW_RECOVERY_CODES_THRESHOLD = 3;

type MfaStatus = Me.Response['data'];

const TwoFactorStatus = ({ status }: { status: MfaStatus }) => {
  const { formatMessage, formatDate } = useIntl();

  if (!status.enabled) {
    return (
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography textColor="neutral600">
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.status.disabled',
            defaultMessage: 'Not enabled',
          })}
        </Typography>
        {status.required ? (
          <Typography textColor="warning700">
            {status.graceUntil
              ? formatMessage(
                  {
                    id: 'Settings.profile.form.section.mfa.status.required.deadline',
                    defaultMessage: 'Required for your account. Set it up before {datetime}.',
                  },
                  {
                    datetime: formatDate(status.graceUntil, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  }
                )
              : formatMessage({
                  id: 'Settings.profile.form.section.mfa.status.required',
                  defaultMessage: 'Required for your account.',
                })}
          </Typography>
        ) : null}
      </Flex>
    );
  }

  return (
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Typography>
        {formatMessage(
          {
            id: 'Settings.profile.form.section.mfa.status.enabled',
            defaultMessage: 'Enabled since {date}',
          },
          { date: status.enabledAt ? formatDate(status.enabledAt, { dateStyle: 'medium' }) : '' }
        )}
      </Typography>
      <Typography textColor="neutral600">
        {formatMessage(
          {
            id: 'Settings.profile.form.section.mfa.status.codes',
            defaultMessage: '{count, plural, one {# recovery code} other {# recovery codes}} left',
          },
          { count: status.recoveryCodesRemaining }
        )}
      </Typography>
    </Flex>
  );
};

/**
 * Lists the same unseen `admin::mfa-event` rows the next-login toast (`MfaNotices`) summarised,
 * so nothing is lost if that toast was dismissed, timed out, or was never seen because it fired
 * on a different device. "Mark all as seen" clears every unseen notice at once (an absent `ids`
 * in the request body, per `MarkNoticesSeen.Request`), unlike the toast's dismiss which only
 * marks the ones it announced.
 */
const RecentSecurityEvents = ({
  notices,
  onMarkAllSeen,
}: {
  notices: MfaEventNotice[];
  onMarkAllSeen: () => void;
}) => {
  const { formatMessage, formatDate } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Typography variant="delta" tag="h3">
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.notices.title',
          defaultMessage: 'Recent security events',
        })}
      </Typography>
      <Flex tag="ul" role="list" direction="column" alignItems="stretch" gap={1}>
        {notices.map((notice) => (
          <Typography key={`${notice.id}`} tag="li" textColor="neutral600">
            {formatMfaNotice(notice, formatMessage, formatDate)}
          </Typography>
        ))}
      </Flex>
      <Flex>
        <Button variant="tertiary" onClick={onMarkAllSeen}>
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.notices.markSeen',
            defaultMessage: 'Mark all as seen',
          })}
        </Button>
      </Flex>
    </Flex>
  );
};

const TwoFactorSection = () => {
  const { formatMessage } = useIntl();
  const { data: status, error, isLoading } = useGetMfaStatusQuery();
  const { data: notices } = useGetMfaNoticesQuery();
  const [markNoticesSeen] = useMarkMfaNoticesSeenMutation();
  /**
   * Dismissing a warning only hides it for the lifetime of this component instance -- nothing is
   * persisted, so the warning comes back the next time the profile page is visited (this state
   * only resets on remount; the status query re-running while mounted does not reset it).
   */
  const [dismissedAck, setDismissedAck] = React.useState(false);
  const [dismissedLowCodes, setDismissedLowCodes] = React.useState(false);
  const [enrolOpen, setEnrolOpen] = React.useState(false);
  const [replaceOpen, setReplaceOpen] = React.useState(false);
  const [regenerateOpen, setRegenerateOpen] = React.useState(false);
  const [disableOpen, setDisableOpen] = React.useState(false);

  // 404 means the future flag is off: the feature does not exist on this instance. The UI never
  // reads the flag itself -- a 404 from /admin/mfa/me is the only signal it is off.
  const isNotFound = isNotFoundError(error);

  if (isLoading || isNotFound || !status) {
    return null;
  }

  const showAckWarning = status.enabled && !status.codesAcknowledged && !dismissedAck;
  const showLowCodesWarning =
    status.enabled &&
    status.codesAcknowledged &&
    status.recoveryCodesRemaining <= LOW_RECOVERY_CODES_THRESHOLD &&
    !dismissedLowCodes;

  return (
    <Panel>
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.title',
          defaultMessage: 'Two-factor authentication',
        })}
      </Typography>
      <Typography textColor="neutral600">
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.description',
          defaultMessage:
            'Protect your account with a code from an authenticator app each time you log in.',
        })}
      </Typography>
      {showAckWarning ? (
        <Alert
          variant="warning"
          onClose={() => setDismissedAck(true)}
          closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
          title={formatMessage({
            id: 'Settings.profile.form.section.mfa.warning.ack.title',
            defaultMessage: 'Recovery codes not saved',
          })}
        >
          {formatMessage({
            id: 'Settings.profile.form.section.mfa.warning.ack.body',
            defaultMessage:
              'You have not confirmed that you saved your recovery codes. They cannot be shown again. Regenerate them and store the new set somewhere safe.',
          })}
        </Alert>
      ) : null}
      {showLowCodesWarning ? (
        <Alert
          variant="warning"
          onClose={() => setDismissedLowCodes(true)}
          closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
          title={formatMessage({
            id: 'Settings.profile.form.section.mfa.warning.low.title',
            defaultMessage: 'Running low on recovery codes',
          })}
        >
          {formatMessage(
            {
              id: 'Settings.profile.form.section.mfa.warning.low.body',
              defaultMessage:
                'You have only {count, plural, one {# recovery code} other {# recovery codes}} left. Regenerate them before you run out.',
            },
            { count: status.recoveryCodesRemaining }
          )}
        </Alert>
      ) : null}
      <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
        <TwoFactorStatus status={status} />
        {!status.enabled ? (
          <Flex gap={2}>
            <Button onClick={() => setEnrolOpen(true)}>
              {formatMessage({
                id: 'Settings.profile.form.section.mfa.enable',
                defaultMessage: 'Enable two-factor authentication',
              })}
            </Button>
          </Flex>
        ) : (
          <Flex direction="column" alignItems="flex-end" gap={2}>
            <Flex gap={2} wrap="wrap" justifyContent="flex-end">
              <Button variant="secondary" onClick={() => setRegenerateOpen(true)}>
                {formatMessage({
                  id: 'Settings.profile.form.section.mfa.regenerate.title',
                  defaultMessage: 'Generate new recovery codes',
                })}
              </Button>
              <Button variant="secondary" onClick={() => setReplaceOpen(true)}>
                {formatMessage({
                  id: 'Settings.profile.form.section.mfa.replace.title',
                  defaultMessage: 'Replace authenticator',
                })}
              </Button>
              {!status.required ? (
                <Button variant="danger-light" onClick={() => setDisableOpen(true)}>
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.disable.title',
                    defaultMessage: 'Disable two-factor authentication',
                  })}
                </Button>
              ) : null}
            </Flex>
            {status.required ? (
              <Typography variant="pi" textColor="neutral600">
                {formatMessage({
                  id: 'Settings.profile.form.section.mfa.disable.required',
                  defaultMessage:
                    'Two-factor authentication is required for your account and cannot be turned off.',
                })}
              </Typography>
            ) : null}
          </Flex>
        )}
      </Flex>
      {notices && notices.length > 0 ? (
        <RecentSecurityEvents notices={notices} onMarkAllSeen={() => markNoticesSeen({})} />
      ) : null}
      {/*
       * All dialogs are mounted unconditionally (only `open` toggles), same as `EnrolDialog`
       * below: the `Mfa` tag invalidation that follows a successful regenerate or disable (see
       * services/mfa.ts) refetches this section's status query, and mounting a dialog only while
       * `status.enabled` is true would unmount it out from under itself the moment that refetch
       * flips `enabled` to `false` mid-flow. The `ReAuthDialog intent="disable"` stays mounted
       * even while `status.required` hides its trigger button above: the server refuses a
       * disable for a required user regardless, so there's nothing to gain by unmounting it, and
       * mounting it conditionally would risk the same unmount-mid-flow hazard.
       *
       * `EnrolDialog` renders as a single instance for both `enrol` and `replace` modes -- not
       * two -- because both share the same `MFA_ENROL_CACHE_KEYS` `fixedCacheKey`s (see
       * EnrolDialog.tsx); two mounted instances would share one cached mutation result and could
       * clobber each other's in-flight state.
       */}
      <EnrolDialog
        open={enrolOpen || replaceOpen}
        mode={replaceOpen ? 'replace' : 'enrol'}
        onClose={() => {
          setEnrolOpen(false);
          setReplaceOpen(false);
        }}
      />
      <ReAuthDialog
        open={regenerateOpen}
        onClose={() => setRegenerateOpen(false)}
        intent="regenerate"
      />
      <ReAuthDialog open={disableOpen} onClose={() => setDisableOpen(false)} intent="disable" />
    </Panel>
  );
};

export { TwoFactorSection, TwoFactorStatus };
export type { MfaStatus };
