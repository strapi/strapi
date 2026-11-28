import * as React from 'react';

import { Button, Flex, Status, Typography } from '@strapi/design-system';
import { Information } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../features/Notifications';
import { useMfaErrorMessage } from '../../../../../hooks/useMfaErrorMessage';
import { useGetMfaStatusQuery, useUnlockUserMfaMutation } from '../../../../../services/mfa';
import { MFA_DATE_TIME_FORMAT } from '../../../../../utils/mfaDates';
import {
  ConfirmDowngradeDialog,
  type DowngradeCredentials,
} from '../../Security/components/ConfirmDowngradeDialog';

import { ReauthDescription, runWithCredentials } from './MfaReauth';

interface UserLockStatusProps {
  userId: number | string;
  lockedAt: string | Date;
  canUpdate: boolean;
  /** Called once the account is unlocked, so the page can say a new grace period will start. */
  onUnlocked?: () => void;
}

/**
 * The lock, shown with the account status on the user page. A lock is a login state: it stops
 * *password* login after the two-factor deadline passed (SSO logins are exempt, and the copy says
 * so). Unlock restores password login without starting a new grace period, since the user's next
 * login does that, so an unlock while they are away cannot re-lock them unseen. It lowers this
 * user's protection, so the server asks the acting administrator for their own password, plus a
 * code when they have a second factor.
 */
const UserLockStatus = ({ userId, lockedAt, canUpdate, onUnlocked }: UserLockStatusProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useMfaErrorMessage();
  const [unlock, { isLoading }] = useUnlockUserMfaMutation();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // What the viewer owes to re-authenticate. Until it loads, the dialog asks for both; the server
  // decides either way.
  const { data: viewerMfa } = useGetMfaStatusQuery();

  const handleUnlock = (credentials?: DowngradeCredentials) =>
    runWithCredentials(
      (body) => unlock({ id: userId, ...body }),
      credentials,
      () => {
        setConfirmOpen(false);
        onUnlocked?.();
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'Settings.permissions.users.mfa.unlock.success',
            defaultMessage: 'Account unlocked.',
          }),
        });
      },
      toMessage
    );

  return (
    <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap">
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Status size="S" variant="danger">
          <Typography tag="span" variant="omega" fontWeight="bold">
            {formatMessage({
              id: 'Settings.permissions.users.mfa.status.locked',
              defaultMessage: 'Locked',
            })}
          </Typography>
        </Status>
        <Typography textColor="danger600">
          {formatMessage(
            {
              id: 'Settings.permissions.users.mfa.state.locked',
              defaultMessage: 'Locked for password login since {datetime}',
            },
            { datetime: formatDate(lockedAt, MFA_DATE_TIME_FORMAT) }
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: 'Settings.permissions.users.mfa.state.locked.hint',
            defaultMessage:
              'Two-factor authentication was not set up before the deadline. Single sign-on logins are not affected.',
          })}
        </Typography>
      </Flex>
      {/* Viewers who cannot update users still see the lock, read-only: no action to offer. */}
      {canUpdate ? (
        <Button variant="secondary" loading={isLoading} onClick={() => setConfirmOpen(true)}>
          {formatMessage({ id: 'Settings.permissions.users.mfa.unlock', defaultMessage: 'Unlock' })}
        </Button>
      ) : null}
      <ConfirmDowngradeDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleUnlock}
        requiresPassword={viewerMfa?.hasLocalPassword ?? true}
        requiresCode={viewerMfa?.enabled ?? true}
        title={formatMessage({
          id: 'Settings.permissions.users.mfa.unlock.title',
          defaultMessage: 'Unlock this account?',
        })}
        confirmLabel={formatMessage({
          id: 'Settings.permissions.users.mfa.unlock',
          defaultMessage: 'Unlock',
        })}
        // Unlock restores access: it is not a negative action, so no red icon or danger button.
        variant="secondary"
        icon={<Information />}
        description={
          <ReauthDescription
            body={formatMessage({
              id: 'Settings.permissions.users.mfa.unlock.body',
              defaultMessage:
                'The user can log in with their password again. A new grace period to set up two-factor authentication starts at their next login.',
            })}
          />
        }
      />
    </Flex>
  );
};

export { UserLockStatus };
export type { UserLockStatusProps };
