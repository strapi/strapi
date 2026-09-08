import * as React from 'react';

import { Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { Panel } from '../../../../../components/Panel';
import { useNotification } from '../../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../../hooks/useAPIErrorHandler';
import {
  useGetUserTrustedDevicesQuery,
  useRevokeUserTrustedDevicesMutation,
  useUnlockUserMfaMutation,
} from '../../../../../services/mfa';
import { isBaseQueryError } from '../../../../../utils/baseQuery';

import type { AdminUserListItem } from '../../../../../services/users';

interface TwoFactorPanelProps {
  user: Pick<AdminUserListItem, 'id' | 'mfaEnabledAt' | 'mfaGraceUntil' | 'mfaLockedAt'>;
  canUpdate: boolean;
}

/**
 * "Two-factor authentication" on the user edit page, for the people who unlock (the server
 * appends `mfaEnabledAt` / `mfaGraceUntil` / `mfaLockedAt` to `GET /admin/users/:id` only for
 * callers with `admin::users.update`, and only while the feature is on; `EditPage` renders this
 * panel only when those fields are present). One of four states, in priority order: locked,
 * enrolled, in grace, not enrolled. A lock is for *password* login: an SSO session on the same
 * account stays valid until its next token refresh, and the copy says so.
 *
 * Unlock (`POST /admin/mfa/users/:id/unlock`) clears both stamps and does not start a new grace
 * period: the user's next login does, so an unlock while they are away cannot re-lock them
 * unseen. The mutation invalidates this user's `User` tag, so the panel refreshes itself.
 *
 * Cycle 3 adds, for an enrolled user, the number of trusted browsers and a "Revoke trusted
 * devices" action (`DELETE /admin/mfa/users/:id/trusted-devices`, behind `admin::users.update`).
 * Revoking trust is security-positive, it forces the second factor back on, so unlike a reset it
 * needs no re-authentication.
 */
const TwoFactorPanel = ({ user, canUpdate }: TwoFactorPanelProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [unlock, { isLoading }] = useUnlockUserMfaMutation();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Cycle 3. Only an enrolled user can hold trusted browsers (disable and reset clear them), so
  // the query is skipped otherwise. A failed read hides the line rather than showing a false zero.
  const { data: trustedDevices = [], isError: trustedDevicesFailed } =
    useGetUserTrustedDevicesQuery({ id: user.id }, { skip: !user.mfaEnabledAt });
  const [revokeTrustedDevices, { isLoading: isRevokingTrust }] =
    useRevokeUserTrustedDevicesMutation();
  const [revokeTrustOpen, setRevokeTrustOpen] = React.useState(false);

  const dateTime = (value: string | Date) =>
    formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });

  const handleUnlock = async () => {
    const res = await unlock({ id: user.id });
    setConfirmOpen(false);
    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: isBaseQueryError(res.error)
          ? formatAPIError(res.error)
          : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.permissions.users.mfa.unlock.success',
        defaultMessage: 'Account unlocked',
      }),
    });
  };

  const handleRevokeTrustedDevices = async () => {
    const res = await revokeTrustedDevices({ id: user.id });
    setRevokeTrustOpen(false);
    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: isBaseQueryError(res.error)
          ? formatAPIError(res.error)
          : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.permissions.users.mfa.trustedDevices.revoke.success',
        defaultMessage: 'Trusted devices revoked',
      }),
    });
  };

  let state: React.ReactNode;
  if (user.mfaLockedAt) {
    state = (
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography textColor="danger600">
          {formatMessage(
            {
              id: 'Settings.permissions.users.mfa.state.locked',
              defaultMessage: 'Locked for password login since {datetime}',
            },
            { datetime: dateTime(user.mfaLockedAt) }
          )}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: 'Settings.permissions.users.mfa.state.locked.hint',
            defaultMessage:
              'Two-factor authentication was not set up before the deadline. If this account also signs in through single sign-on, that session stays valid until its next refresh.',
          })}
        </Typography>
      </Flex>
    );
  } else if (user.mfaEnabledAt) {
    state = (
      <Typography>
        {formatMessage(
          {
            id: 'Settings.permissions.users.mfa.state.enrolled',
            defaultMessage: 'Enrolled since {date}',
          },
          { date: formatDate(user.mfaEnabledAt, { dateStyle: 'medium' }) }
        )}
      </Typography>
    );
  } else if (user.mfaGraceUntil) {
    state = (
      <Typography>
        {formatMessage(
          {
            id: 'Settings.permissions.users.mfa.state.grace',
            defaultMessage: 'Not enrolled. Must set up two-factor authentication before {datetime}',
          },
          { datetime: dateTime(user.mfaGraceUntil) }
        )}
      </Typography>
    );
  } else {
    state = (
      <Typography textColor="neutral600">
        {formatMessage({
          id: 'Settings.permissions.users.mfa.state.none',
          defaultMessage: 'Not enrolled',
        })}
      </Typography>
    );
  }

  return (
    <Panel>
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: 'Settings.permissions.users.mfa.title',
          defaultMessage: 'Two-factor authentication',
        })}
      </Typography>
      <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap">
        {state}
        {user.mfaLockedAt ? (
          <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Dialog.Trigger>
              <Button variant="secondary" disabled={!canUpdate} loading={isLoading}>
                {formatMessage({
                  id: 'Settings.permissions.users.mfa.unlock',
                  defaultMessage: 'Unlock',
                })}
              </Button>
            </Dialog.Trigger>
            <ConfirmDialog
              variant="default"
              title={formatMessage({
                id: 'Settings.permissions.users.mfa.unlock.title',
                defaultMessage: 'Unlock this account?',
              })}
              onConfirm={handleUnlock}
            >
              {formatMessage({
                id: 'Settings.permissions.users.mfa.unlock.body',
                defaultMessage:
                  'The user can log in with their password again. A new grace period to set up two-factor authentication starts at their next login.',
              })}
            </ConfirmDialog>
          </Dialog.Root>
        ) : null}
      </Flex>
      {user.mfaEnabledAt && !trustedDevicesFailed ? (
        <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
          <Typography textColor="neutral600">
            {formatMessage(
              {
                id: 'Settings.permissions.users.mfa.trustedDevices.count',
                defaultMessage:
                  '{count, plural, =0 {No trusted devices} one {# trusted device} other {# trusted devices}}',
              },
              { count: trustedDevices.length }
            )}
          </Typography>
          {trustedDevices.length > 0 && canUpdate ? (
            <Dialog.Root open={revokeTrustOpen} onOpenChange={setRevokeTrustOpen}>
              <Dialog.Trigger>
                <Button variant="danger-light" loading={isRevokingTrust}>
                  {formatMessage({
                    id: 'Settings.permissions.users.mfa.trustedDevices.revoke',
                    defaultMessage: 'Revoke trusted devices',
                  })}
                </Button>
              </Dialog.Trigger>
              <ConfirmDialog
                title={formatMessage({
                  id: 'Settings.permissions.users.mfa.trustedDevices.revoke.title',
                  defaultMessage: "Revoke this user's trusted devices?",
                })}
                onConfirm={handleRevokeTrustedDevices}
              >
                {formatMessage({
                  id: 'Settings.permissions.users.mfa.trustedDevices.revoke.body',
                  defaultMessage:
                    'Every browser this user trusted will ask for a code at its next login. They keep their authenticator and recovery codes.',
                })}
              </ConfirmDialog>
            </Dialog.Root>
          ) : null}
        </Flex>
      ) : null}
    </Panel>
  );
};

export { TwoFactorPanel };
export type { TwoFactorPanelProps };
