import * as React from 'react';

import { Alert, Button, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetMfaStatusQuery } from '../../services/mfa';
import { isBaseQueryError } from '../../utils/baseQuery';

import { EnrolDialog } from './EnrolDialog';
import { Panel } from './Panel';

import type { Me } from '../../../../shared/contracts/mfa';

/** Below this many unused recovery codes the section nags; matches the spec's low-codes warning. */
export const LOW_RECOVERY_CODES_THRESHOLD = 3;

type MfaStatus = Me.Response['data'];

interface TwoFactorSectionProps {
  /** Filled by the enrol / regenerate / disable dialogs in later tasks. */
  renderActions?: (status: MfaStatus) => React.ReactNode;
}

const TwoFactorStatus = ({ status }: { status: MfaStatus }) => {
  const { formatMessage, formatDate } = useIntl();

  if (!status.enabled) {
    return (
      <Typography textColor="neutral600">
        {formatMessage({
          id: 'Settings.profile.form.section.mfa.status.disabled',
          defaultMessage: 'Not enabled',
        })}
      </Typography>
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
            defaultMessage: '{count} recovery codes left',
          },
          { count: status.recoveryCodesRemaining }
        )}
      </Typography>
    </Flex>
  );
};

const TwoFactorSection = ({ renderActions }: TwoFactorSectionProps) => {
  const { formatMessage } = useIntl();
  const { data: status, error, isLoading } = useGetMfaStatusQuery();
  /**
   * Dismissing a warning only hides it for the lifetime of this component instance -- nothing is
   * persisted, so the warning comes back the next time the profile page is visited (or as soon as
   * the underlying condition changes again, since the query re-running resets this state).
   */
  const [dismissedAck, setDismissedAck] = React.useState(false);
  const [dismissedLowCodes, setDismissedLowCodes] = React.useState(false);
  const [enrolOpen, setEnrolOpen] = React.useState(false);

  // 404 means the future flag is off: the feature does not exist on this instance. The UI never
  // reads the flag itself -- a 404 from /admin/mfa/me is the only signal it is off.
  const isNotFound = Boolean(
    error && isBaseQueryError(error) && 'status' in error && error.status === 404
  );

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
                'You have only {count} recovery codes left. Regenerate them before you run out.',
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
        ) : renderActions ? (
          <Flex gap={2}>{renderActions(status)}</Flex>
        ) : null}
      </Flex>
      <EnrolDialog open={enrolOpen} onClose={() => setEnrolOpen(false)} />
    </Panel>
  );
};

export { TwoFactorSection, TwoFactorStatus };
export type { MfaStatus };
