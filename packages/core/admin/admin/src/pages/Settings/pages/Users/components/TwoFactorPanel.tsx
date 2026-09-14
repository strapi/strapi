import * as React from 'react';

import { Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { Panel } from '../../../../../components/Panel';
import { useNotification } from '../../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../../hooks/useAPIErrorHandler';
import {
  useDeleteUserPasskeysMutation,
  useGetUserPasskeysQuery,
  useGetUserTrustedDevicesQuery,
  useResetUserMfaMutation,
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
 * "Two-factor authentication" on the user edit page. The server appends the three mfa fields to
 * `GET /admin/users/:id` only for callers with `admin::users.update` and only while the feature
 * is on, and `EditPage` renders this panel only when they are present. One of four states, in
 * priority order: locked, enrolled, in grace, not enrolled. A lock stops *password* login only --
 * an SSO session on the same account survives until its next token refresh, and the copy says so.
 *
 * Three of the four actions are security-positive and need no re-authentication: unlock restores
 * password login without starting a new grace period (the user's next login does that, so an
 * unlock while they are away cannot re-lock them unseen), and revoking trust or removing passkeys
 * only forces the second factor back on.
 *
 * Reset is the exception and the only destructive one: it strips the factor entirely and signs
 * the user out everywhere. Offered for any enrolled account rather than only a locked one,
 * because the user it serves has no lock to clear -- they know their password but have lost their
 * authenticator and spent their recovery codes, and the alternative is a shell the customer may
 * not have.
 */
const TwoFactorPanel = ({ user, canUpdate }: TwoFactorPanelProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [unlock, { isLoading }] = useUnlockUserMfaMutation();
  const [resetMfa, { isLoading: isResetting }] = useResetUserMfaMutation();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Only an enrolled user can hold trusted browsers (disable and reset clear them), so the query
  // is skipped otherwise. Gating on `isSuccess` rather than defaulting `data` to `[]` keeps the
  // line from flashing "No trusted devices" in flight, or showing a false zero after a failed
  // read -- it hides the line instead.
  const {
    data: trustedDevices = [],
    isSuccess: trustedDevicesLoaded,
    isError: trustedDevicesFailed,
  } = useGetUserTrustedDevicesQuery({ id: user.id }, { skip: !user.mfaEnabledAt });
  const [revokeTrustedDevices, { isLoading: isRevokingTrust }] =
    useRevokeUserTrustedDevicesMutation();
  const [revokeTrustOpen, setRevokeTrustOpen] = React.useState(false);

  // Same two guards as the trusted-device query above, for the same reasons. The response is a
  // count, not a list: an administrator gets a number, never an inventory of somebody's hardware.
  const {
    data: passkeys,
    isSuccess: passkeysLoaded,
    isError: passkeysFailed,
  } = useGetUserPasskeysQuery({ id: user.id }, { skip: !user.mfaEnabledAt });
  const [deletePasskeys, { isLoading: isRemovingPasskeys }] = useDeleteUserPasskeysMutation();
  const [removePasskeysOpen, setRemovePasskeysOpen] = React.useState(false);

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

  const handleReset = async () => {
    const res = await resetMfa({ id: user.id });
    setResetOpen(false);
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
        id: 'Settings.permissions.users.mfa.reset.success',
        defaultMessage: 'Two-factor authentication reset',
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

  const handleRemovePasskeys = async () => {
    const res = await deletePasskeys({ id: user.id });
    setRemovePasskeysOpen(false);
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
        id: 'Settings.permissions.users.mfa.passkeys.remove.success',
        defaultMessage: 'Passkeys removed',
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
        {/*
          Reset is offered for any enrolled account, whether or not it is locked, because the
          case it exists for is not a lock: the user still knows their password but has lost the
          authenticator and spent their recovery codes. Unlock does not help them -- there is
          nothing to unlock -- and without this the only way back in is a shell, which a Cloud
          customer does not have.
        */}
        {user.mfaEnabledAt && canUpdate ? (
          <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
            <Dialog.Trigger>
              <Button variant="danger-light" loading={isResetting}>
                {formatMessage({
                  id: 'Settings.permissions.users.mfa.reset',
                  defaultMessage: 'Reset',
                })}
              </Button>
            </Dialog.Trigger>
            <ConfirmDialog
              title={formatMessage({
                id: 'Settings.permissions.users.mfa.reset.title',
                defaultMessage: "Reset this user's two-factor authentication?",
              })}
              onConfirm={handleReset}
            >
              {formatMessage({
                id: 'Settings.permissions.users.mfa.reset.body',
                defaultMessage:
                  'Their authenticator app, recovery codes, passkeys and trusted devices are all removed, and they are signed out everywhere. They sign in with their password alone until they set up two-factor authentication again. Use this when a user has lost their authenticator and their recovery codes.',
              })}
            </ConfirmDialog>
          </Dialog.Root>
        ) : null}
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
      {user.mfaEnabledAt && trustedDevicesLoaded && !trustedDevicesFailed ? (
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
      {user.mfaEnabledAt && passkeysLoaded && !passkeysFailed ? (
        <Flex justifyContent="space-between" alignItems="center" gap={4} wrap="wrap">
          <Typography textColor="neutral600">
            {formatMessage(
              {
                id: 'Settings.permissions.users.mfa.passkeys.count',
                defaultMessage:
                  '{count, plural, =0 {No passkeys} one {# passkey} other {# passkeys}}',
              },
              { count: passkeys?.count ?? 0 }
            )}
          </Typography>
          {(passkeys?.count ?? 0) > 0 && canUpdate ? (
            <Dialog.Root open={removePasskeysOpen} onOpenChange={setRemovePasskeysOpen}>
              <Dialog.Trigger>
                <Button variant="danger-light" loading={isRemovingPasskeys}>
                  {formatMessage({
                    id: 'Settings.permissions.users.mfa.passkeys.remove',
                    defaultMessage: 'Remove passkeys',
                  })}
                </Button>
              </Dialog.Trigger>
              <ConfirmDialog
                title={formatMessage({
                  id: 'Settings.permissions.users.mfa.passkeys.remove.title',
                  defaultMessage: "Remove this user's passkeys?",
                })}
                onConfirm={handleRemovePasskeys}
              >
                {formatMessage({
                  id: 'Settings.permissions.users.mfa.passkeys.remove.body',
                  defaultMessage:
                    'Every passkey this user registered will stop working. They keep their authenticator app and recovery codes.',
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
