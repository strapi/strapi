import * as React from 'react';

import { Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { Panel } from '../../../../../components/Panel';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useNotification } from '../../../../../features/Notifications';
import { useMfaErrorMessage } from '../../../../../hooks/useMfaErrorMessage';
import { useRBAC } from '../../../../../hooks/useRBAC';
import { selectAdminPermissions } from '../../../../../selectors';
import {
  useDeleteUserPasskeysMutation,
  useGetMfaStatusQuery,
  useGetUserPasskeysQuery,
  useGetUserTrustedDevicesQuery,
  useResetUserMfaMutation,
  useRevokeUserTrustedDevicesMutation,
} from '../../../../../services/mfa';
import { useGetSecuritySettingsQuery } from '../../../../../services/securitySettings';
import { MFA_DATE_TIME_FORMAT } from '../../../../../utils/mfaDates';
import { getMfaRequirement } from '../../../../../utils/mfaRequirement';
import {
  ConfirmDowngradeDialog,
  type DowngradeCredentials,
} from '../../Security/components/ConfirmDowngradeDialog';

import { ReauthDescription, runWithCredentials } from './MfaReauth';
import { MfaRequirementText } from './TwoFactorStatus';

import type { AdminUserListItem } from '../../../../../services/users';

interface TwoFactorPanelProps {
  user: Pick<
    AdminUserListItem,
    'id' | 'mfaEnabledAt' | 'mfaGraceUntil' | 'mfaLockedAt' | 'mfaRequired' | 'roles'
  >;
  canUpdate: boolean;
  /** The account was just unlocked from this page: its grace period starts at the next login. */
  justUnlocked?: boolean;
}

/**
 * "Two-factor authentication" on the user edit page. The server appends the three mfa fields to
 * `GET /admin/users/:id` only for callers with `admin::users.update` and only while the feature
 * is on, and `EditPage` renders this panel only when they are present. It shows the two-factor
 * state only: enabled, or not set up with its requirement and deadline. The lock is a login state
 * and, with Unlock, lives with the account status (`UserLockStatus`).
 *
 * Reset and removing passkeys each lower this user's protection, so the server asks the acting
 * administrator for their own password, plus a code when they have a second factor
 * (`assertActorReauth`), and only a super admin may do them to a super admin. They use
 * `ConfirmDowngradeDialog`, which collects exactly what `/mfa/me` says the viewer owes: nothing for
 * an SSO-only administrator, the password alone for one without a second factor. Revoking trusted
 * devices only forces the second factor back on, so it stays a plain confirmation.
 *
 * Reset is the only destructive one: it strips the factor entirely and logs the user out
 * everywhere. Offered for any enrolled account rather than only a locked one,
 * because the user it serves has no lock to clear -- they know their password but have lost their
 * authenticator and spent their recovery codes, and the alternative is a shell the customer may
 * not have.
 *
 * An unlocked account reads like one that never started: not enrolled, no grace, no lock. The
 * enforcement settings tell the two apart from "not required at all" -- when the viewer may read
 * them -- so the page can say the requirement starts at the user's next login. Without them, only
 * an unlock made on the page (`justUnlocked`) is known to have that effect.
 */
const TwoFactorPanel = ({ user, canUpdate, justUnlocked = false }: TwoFactorPanelProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useMfaErrorMessage();
  const [resetMfa, { isLoading: isResetting }] = useResetUserMfaMutation();
  const [resetOpen, setResetOpen] = React.useState(false);

  // What the viewer owes to re-authenticate (see the component comment). Until it loads, the
  // dialogs ask for both, which is what most administrators owe; the server decides either way.
  const { data: viewerMfa } = useGetMfaStatusQuery();
  const requiresPassword = viewerMfa?.hasLocalPassword ?? true;
  const requiresCode = viewerMfa?.enabled ?? true;

  const permissions = useTypedSelector(selectAdminPermissions);
  const {
    allowedActions: { canRead: canReadSecuritySettings },
  } = useRBAC({ read: permissions.settings?.security?.read ?? [] });
  // Errors (including the kill-switch 404) leave `settings` undefined: the panel then falls back to
  // what it knows without them.
  const { data: settings } = useGetSecuritySettingsQuery(undefined, {
    skip: !canReadSecuritySettings,
  });
  // The server's answer when it sent one (exemptions applied); the settings otherwise.
  const requiredBySettings =
    user.mfaRequired ??
    (settings
      ? settings.mfa.mode === 'required' ||
        (settings.mfa.mode === 'optional' &&
          (user.roles ?? []).some((role) => settings.mfa.requiredRoles.includes(String(role.id))))
      : undefined);

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

  const dateTime = (value: string | Date) => formatDate(value, MFA_DATE_TIME_FORMAT);

  const handleReset = (credentials?: DowngradeCredentials) =>
    runWithCredentials(
      (body) => resetMfa({ id: user.id, ...body }),
      credentials,
      () => {
        setResetOpen(false);
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'Settings.permissions.users.mfa.reset.success',
            defaultMessage: 'Two-factor authentication reset.',
          }),
        });
      },
      toMessage
    );

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

  const handleRemovePasskeys = (credentials?: DowngradeCredentials) =>
    runWithCredentials(
      (body) => deletePasskeys({ id: user.id, ...body }),
      credentials,
      () => {
        setRemovePasskeysOpen(false);
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'Settings.permissions.users.mfa.passkeys.remove.success',
            defaultMessage: 'Passkeys removed.',
          }),
        });
      },
      toMessage
    );

  const reauthDescription = (body: string) => <ReauthDescription body={body} />;

  // Only the two-factor state and its deadline. The lock is a login state and lives with the
  // account status above.
  const requirement = getMfaRequirement(user, {
    requiredFallback: requiredBySettings || (justUnlocked && requiredBySettings === undefined),
  });
  const state: React.ReactNode = user.mfaEnabledAt ? (
    <Typography>
      {formatMessage(
        {
          id: 'Settings.permissions.users.mfa.state.enrolled',
          defaultMessage: 'Enabled since {date}',
        },
        { date: formatDate(user.mfaEnabledAt, { dateStyle: 'medium' }) }
      )}
    </Typography>
  ) : (
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Typography>
        {formatMessage({
          id: 'Settings.permissions.users.mfa.status.notSetUp',
          defaultMessage: 'Not set up',
        })}
      </Typography>
      {requirement.kind !== 'none' ? (
        <Typography variant="pi" textColor="neutral600">
          <MfaRequirementText requirement={requirement} />
        </Typography>
      ) : null}
      {!user.mfaLockedAt && user.mfaGraceUntil ? (
        <Typography variant="pi" textColor="neutral600">
          {formatMessage(
            {
              id: 'Settings.permissions.users.mfa.state.deadline',
              defaultMessage: 'Set up before {datetime}',
            },
            { datetime: dateTime(user.mfaGraceUntil) }
          )}
        </Typography>
      ) : null}
    </Flex>
  );

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
          <>
            <Button variant="danger-light" loading={isResetting} onClick={() => setResetOpen(true)}>
              {formatMessage({
                id: 'Settings.permissions.users.mfa.reset',
                defaultMessage: 'Reset',
              })}
            </Button>
            <ConfirmDowngradeDialog
              open={resetOpen}
              onClose={() => setResetOpen(false)}
              onConfirm={handleReset}
              requiresPassword={requiresPassword}
              requiresCode={requiresCode}
              title={formatMessage({
                id: 'Settings.permissions.users.mfa.reset.title',
                defaultMessage: "Reset this user's two-factor authentication?",
              })}
              confirmLabel={formatMessage({
                id: 'Settings.permissions.users.mfa.reset',
                defaultMessage: 'Reset',
              })}
              description={reauthDescription(
                formatMessage({
                  id: 'Settings.permissions.users.mfa.reset.body',
                  defaultMessage:
                    'Their authenticator app, recovery codes, passkeys and trusted devices are all removed, and they are logged out everywhere. They log in with their password alone until they set up two-factor authentication again. Use this when a user has lost their authenticator and their recovery codes.',
                })
              )}
            />
          </>
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
            <>
              <Button
                variant="danger-light"
                loading={isRemovingPasskeys}
                onClick={() => setRemovePasskeysOpen(true)}
              >
                {formatMessage({
                  id: 'Settings.permissions.users.mfa.passkeys.remove',
                  defaultMessage: 'Remove passkeys',
                })}
              </Button>
              <ConfirmDowngradeDialog
                open={removePasskeysOpen}
                onClose={() => setRemovePasskeysOpen(false)}
                onConfirm={handleRemovePasskeys}
                requiresPassword={requiresPassword}
                requiresCode={requiresCode}
                title={formatMessage({
                  id: 'Settings.permissions.users.mfa.passkeys.remove.title',
                  defaultMessage: "Remove this user's passkeys?",
                })}
                confirmLabel={formatMessage({
                  id: 'Settings.permissions.users.mfa.passkeys.remove.confirm',
                  defaultMessage: 'Remove',
                })}
                description={reauthDescription(
                  formatMessage({
                    id: 'Settings.permissions.users.mfa.passkeys.remove.body',
                    defaultMessage:
                      'Every passkey this user registered will stop working. They keep their authenticator app and recovery codes.',
                  })
                )}
              />
            </>
          ) : null}
        </Flex>
      ) : null}
    </Panel>
  );
};

export { TwoFactorPanel };
export type { TwoFactorPanelProps };
