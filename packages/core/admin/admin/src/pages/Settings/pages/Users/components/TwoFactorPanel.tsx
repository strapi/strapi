import * as React from 'react';

import { Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { Information } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { Panel } from '../../../../../components/Panel';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useNotification } from '../../../../../features/Notifications';
import { useRBAC } from '../../../../../hooks/useRBAC';
import { useToMessage } from '../../../../../hooks/useToMessage';
import { selectAdminPermissions } from '../../../../../selectors';
import {
  useDeleteUserPasskeysMutation,
  useGetUserPasskeysQuery,
  useGetUserTrustedDevicesQuery,
  useResetUserMfaMutation,
  useRevokeUserTrustedDevicesMutation,
  useUnlockUserMfaMutation,
} from '../../../../../services/mfa';
import { useGetSecuritySettingsQuery } from '../../../../../services/securitySettings';

import type { AdminUserListItem } from '../../../../../services/users';

interface TwoFactorPanelProps {
  user: Pick<AdminUserListItem, 'id' | 'mfaEnabledAt' | 'mfaGraceUntil' | 'mfaLockedAt' | 'roles'>;
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
 * Reset is the exception and the only destructive one: it strips the factor entirely and logs
 * the user out everywhere. Offered for any enrolled account rather than only a locked one,
 * because the user it serves has no lock to clear -- they know their password but have lost their
 * authenticator and spent their recovery codes, and the alternative is a shell the customer may
 * not have.
 *
 * An unlocked account reads like one that never started: not enrolled, no grace, no lock. The
 * enforcement settings tell the two apart from "not required at all" -- when the viewer may read
 * them -- so the page can say a new grace period starts at the user's next login, and for how
 * many days. Without them, only an unlock made on this page is known to have that effect.
 */
const TwoFactorPanel = ({ user, canUpdate }: TwoFactorPanelProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
  const [unlock, { isLoading }] = useUnlockUserMfaMutation();
  const [resetMfa, { isLoading: isResetting }] = useResetUserMfaMutation();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [justUnlocked, setJustUnlocked] = React.useState(false);

  const permissions = useTypedSelector(selectAdminPermissions);
  const {
    allowedActions: { canRead: canReadSecuritySettings },
  } = useRBAC({ read: permissions.settings?.security?.read ?? [] });
  // Errors (including the feature-off 404) leave `settings` undefined: the panel then falls back to
  // what it knows without them.
  const { data: settings } = useGetSecuritySettingsQuery(undefined, {
    skip: !canReadSecuritySettings,
  });
  const requiredBySettings = settings
    ? settings.mfa.mode === 'required' ||
      (settings.mfa.mode === 'optional' &&
        (user.roles ?? []).some((role) => settings.mfa.requiredRoles.includes(String(role.id))))
    : undefined;

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
        message: toMessage(res.error),
      });
      return;
    }
    setJustUnlocked(true);
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.permissions.users.mfa.unlock.success',
        defaultMessage: 'Account unlocked.',
      }),
    });
  };

  const handleReset = async () => {
    const res = await resetMfa({ id: user.id });
    setResetOpen(false);
    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: toMessage(res.error),
      });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.permissions.users.mfa.reset.success',
        defaultMessage: 'Two-factor authentication reset.',
      }),
    });
  };

  const handleRevokeTrustedDevices = async () => {
    const res = await revokeTrustedDevices({ id: user.id });
    setRevokeTrustOpen(false);
    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: toMessage(res.error),
      });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.permissions.users.mfa.trustedDevices.revoke.success',
        defaultMessage: 'Trusted devices revoked.',
      }),
    });
  };

  const handleRemovePasskeys = async () => {
    const res = await deletePasskeys({ id: user.id });
    setRemovePasskeysOpen(false);
    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: toMessage(res.error),
      });
      return;
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.permissions.users.mfa.passkeys.remove.success',
        defaultMessage: 'Passkeys removed.',
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
              'Two-factor authentication was not set up before the deadline. If this account also logs in through single sign-on, that session stays valid until its next refresh.',
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
            defaultMessage: 'Enabled since {date}',
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
            defaultMessage: 'Not enabled. Must be set up before {datetime}',
          },
          { datetime: dateTime(user.mfaGraceUntil) }
        )}
      </Typography>
    );
  } else if (requiredBySettings && settings) {
    state = (
      <Typography>
        {formatMessage(
          {
            id: 'Settings.permissions.users.mfa.state.pending',
            defaultMessage: 'Not set up. A new {days}-day grace period starts at their next login.',
          },
          { days: settings.mfa.graceDays }
        )}
      </Typography>
    );
  } else if (justUnlocked && requiredBySettings === undefined) {
    state = (
      <Typography>
        {formatMessage({
          id: 'Settings.permissions.users.mfa.state.pending.unknownDays',
          defaultMessage: 'Not set up. A new grace period starts at their next login.',
        })}
      </Typography>
    );
  } else {
    state = (
      <Typography textColor="neutral600">
        {formatMessage({
          id: 'Settings.permissions.users.mfa.state.none',
          defaultMessage: 'Not enabled',
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
              endAction={
                <Dialog.Action>
                  <Button fullWidth variant="danger-light" onClick={handleReset}>
                    {formatMessage({
                      id: 'Settings.permissions.users.mfa.reset',
                      defaultMessage: 'Reset',
                    })}
                  </Button>
                </Dialog.Action>
              }
            >
              {formatMessage({
                id: 'Settings.permissions.users.mfa.reset.body',
                defaultMessage:
                  'Their authenticator app, recovery codes, passkeys and trusted devices are all removed, and they are logged out everywhere. They log in with their password alone until they set up two-factor authentication again. Use this when a user has lost their authenticator and their recovery codes.',
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
            {/* Unlocking restores access rather than removing anything, so no danger styling. */}
            <ConfirmDialog
              icon={<Information fill="neutral500" />}
              title={formatMessage({
                id: 'Settings.permissions.users.mfa.unlock.title',
                defaultMessage: 'Unlock this account?',
              })}
              endAction={
                <Dialog.Action>
                  <Button fullWidth variant="default" onClick={handleUnlock}>
                    {formatMessage({
                      id: 'Settings.permissions.users.mfa.unlock',
                      defaultMessage: 'Unlock',
                    })}
                  </Button>
                </Dialog.Action>
              }
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
                endAction={
                  <Dialog.Action>
                    <Button fullWidth variant="danger-light" onClick={handleRevokeTrustedDevices}>
                      {formatMessage({
                        id: 'Settings.permissions.users.mfa.trustedDevices.revoke.confirm',
                        defaultMessage: 'Revoke',
                      })}
                    </Button>
                  </Dialog.Action>
                }
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
                endAction={
                  <Dialog.Action>
                    <Button fullWidth variant="danger-light" onClick={handleRemovePasskeys}>
                      {formatMessage({
                        id: 'Settings.permissions.users.mfa.passkeys.remove.confirm',
                        defaultMessage: 'Remove',
                      })}
                    </Button>
                  </Dialog.Action>
                }
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
