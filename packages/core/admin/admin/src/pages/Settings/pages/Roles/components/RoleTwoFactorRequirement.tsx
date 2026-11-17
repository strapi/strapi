import * as React from 'react';

import { Box, Button, Checkbox, Dialog, Flex, Link, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useAuth } from '../../../../../features/Auth';
import { useNotification } from '../../../../../features/Notifications';
import { useMfaErrorMessage } from '../../../../../hooks/useMfaErrorMessage';
import { useRBAC } from '../../../../../hooks/useRBAC';
import { selectAdminPermissions } from '../../../../../selectors';
import { useGetMfaStatusQuery } from '../../../../../services/mfa';
import {
  useGetSecuritySettingsQuery,
  useLazyGetMfaImpactQuery,
  useUpdateSecuritySettingsMutation,
} from '../../../../../services/securitySettings';
import {
  ConfirmDowngradeDialog,
  type DowngradeCredentials,
} from '../../Security/components/ConfirmDowngradeDialog';
import { EnforceImpactMessage } from '../../Security/components/EnforceImpactMessage';
import { isEnforcementRaise, isSecurityDowngrade } from '../../Security/utils/isSecurityDowngrade';

import type { MfaEnforcementSettings } from '../../../../../../../shared/contracts/security-settings';

interface RoleTwoFactorRequirementProps {
  roleId: string | number;
  /** Named in the confirmation when the requirement is dropped. */
  roleName?: string;
}

/**
 * "Require two-factor authentication for this role" on the role edit page: the role's
 * `admin::role.mfaRequired` flag, which is owned by the security settings and written through
 * `PUT /admin/security-settings` (`mfa.requiredRoles`), never through the role endpoints. The same
 * setting is the Security page's "Required for selected roles", so each page says so and links to
 * the other. The checkbox saves on its own, apart from
 * the role form's Save, and with the Security page's confirmations: requiring it shows how many
 * users it puts on the clock, and dropping it asks for the caller's password (and a code when the
 * caller is enrolled), because the server refuses a lowered requirement without them.
 *
 * Mounted only in a build with the feature, and shown only to a caller who may read and update the
 * security settings. A 404 from `GET /admin/security-settings` is the kill-switch signal, as on the
 * Security page. While nothing is required, turning it on moves the mode to "Required for selected roles"
 * with this role alone, and turning off the last required role moves it back to "Not required".
 * While everyone is required the checkbox shows the effective state, disabled, and says where it is
 * set.
 */
const RoleTwoFactorRequirement = ({ roleId, roleName }: RoleTwoFactorRequirementProps) => {
  const { formatMessage } = useIntl();
  const hintId = React.useId();
  const explanationId = React.useId();
  const { toggleNotification } = useNotification();
  const toMessage = useMfaErrorMessage();
  const permissions = useTypedSelector(selectAdminPermissions);
  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canRead, canUpdate },
  } = useRBAC({
    read: permissions.settings?.security?.read ?? [],
    update: permissions.settings?.security?.update ?? [],
  });
  const allowed = !isLoadingRBAC && Boolean(canRead) && Boolean(canUpdate);

  const { data: settings, isFetching } = useGetSecuritySettingsQuery(undefined, {
    skip: !allowed,
  });
  const { data: mfaStatus } = useGetMfaStatusQuery(undefined, { skip: !allowed });
  const callerRoleIds = useAuth('RoleTwoFactorRequirement', (state) =>
    (state.user?.roles ?? []).map((role) => String(role.id))
  );
  const [fetchImpact, { isFetching: isFetchingImpact }] = useLazyGetMfaImpactQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSecuritySettingsMutation();

  const [impact, setImpact] = React.useState<{ affected: number; enrolled: number } | null>(null);
  const [lowering, setLowering] = React.useState(false);

  if (!allowed || !settings) {
    return null;
  }

  const id = String(roleId);
  const { mfa } = settings;
  const everyone = mfa.mode === 'required';
  const checked = everyone || (mfa.mode === 'optional' && mfa.requiredRoles.includes(id));
  const callerEnrolled = Boolean(mfaStatus?.enabled);
  // Same rule as the Security page: the server refuses to require two-factor authentication of a
  // caller who has none, so say so before the click.
  const mustEnrolFirst =
    !everyone &&
    !checked &&
    !callerEnrolled &&
    Boolean(mfaStatus?.hasLocalPassword) &&
    callerRoleIds.includes(id);

  /**
   * From "Not required", the role becomes the only one selected: flags kept from an earlier
   * "Required for selected roles" are not brought back by a toggle on a different role. Dropping
   * the last selected role saves "Not required", never "selected roles" with none selected.
   */
  const nextFor = (required: boolean): MfaEnforcementSettings => {
    const others =
      mfa.mode === 'optional'
        ? mfa.requiredRoles.filter((roleIdInList) => roleIdInList !== id)
        : [];
    const requiredRoles = required ? [...others, id] : others;

    return requiredRoles.length > 0
      ? { mode: 'optional', graceDays: mfa.graceDays, requiredRoles }
      : { mode: 'off', graceDays: mfa.graceDays, requiredRoles: [] };
  };

  const submit = async (next: MfaEnforcementSettings, credentials?: DowngradeCredentials) => {
    const res = await updateSettings({ mfa: next, ...credentials });
    if ('error' in res) {
      return toMessage(res.error);
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.roles.form.mfa.saved',
        defaultMessage: 'Two-factor requirement saved.',
      }),
    });
    return undefined;
  };

  const handleChange = async (required: boolean) => {
    const next = nextFor(required);

    if (isSecurityDowngrade(mfa, next)) {
      setLowering(true);
      return;
    }

    if (isEnforcementRaise(mfa, next)) {
      const res = await fetchImpact({ mode: next.mode, requiredRoles: next.requiredRoles });
      if (res.error) {
        toggleNotification({ type: 'danger', message: toMessage(res.error) });
        return;
      }
      if (res.data) {
        setImpact(res.data);
      }
    }
  };

  const confirmRaise = async () => {
    setImpact(null);
    const message = await submit(nextFor(true));
    if (message) {
      toggleNotification({ type: 'danger', message });
    }
  };

  const confirmLower = async (credentials?: DowngradeCredentials) => {
    const message = await submit(nextFor(false), credentials);
    if (!message) {
      setLowering(false);
    }
    return message;
  };

  const showHint = checked && !everyone;

  const securityLink = (chunks: React.ReactNode) => (
    <Link tag={NavLink} to="/settings/security" isExternal={false}>
      {chunks}
    </Link>
  );

  // What happens on the Security page when this is checked, or why it cannot be unchecked here.
  let explanation: React.ReactNode;
  if (everyone) {
    explanation = formatMessage(
      {
        id: 'Settings.roles.form.mfa.everyone',
        defaultMessage:
          'Required for everyone in <link>Settings > Security</link>. Change it there to set it per role.',
      },
      { link: securityLink }
    );
  } else if (mustEnrolFirst) {
    explanation = formatMessage({
      id: 'Settings.security.mfa.enrolFirst',
      defaultMessage:
        'Set up two-factor authentication on your own account before requiring it for others.',
    });
  } else if (mfa.mode === 'off') {
    explanation = formatMessage(
      {
        id: 'Settings.roles.form.mfa.off',
        defaultMessage:
          'Not required for any role yet. Checking this sets <link>Settings > Security</link> to "Required for selected roles", with this role. It saves as soon as you change it, without the Save button.',
      },
      { link: securityLink }
    );
  } else {
    explanation = formatMessage(
      {
        id: 'Settings.roles.form.mfa.selected',
        defaultMessage:
          'This is the "Required for selected roles" setting in <link>Settings > Security</link>, where all required roles are listed. It saves as soon as you change it, without the Save button.',
      },
      { link: securityLink }
    );
  }

  return (
    // The role form wraps this card, and React bubbles a dialog's submit through its portal to that
    // form: without this the credential dialog's Enter would also save the role.
    <Box
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
      onSubmit={(event: React.FormEvent) => event.stopPropagation()}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: 'Settings.roles.form.mfa.title',
            defaultMessage: 'Two-factor authentication',
          })}
        </Typography>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Checkbox
            name="mfaRequired"
            aria-describedby={showHint ? `${hintId} ${explanationId}` : explanationId}
            checked={checked}
            disabled={everyone || mustEnrolFirst || isSaving || isFetching || isFetchingImpact}
            onCheckedChange={(value) => handleChange(value === true)}
          >
            {formatMessage({
              id: 'Settings.roles.form.mfa.label',
              defaultMessage: 'Require two-factor authentication for this role',
            })}
          </Checkbox>
          {showHint ? (
            <Typography id={hintId} variant="pi" textColor="neutral600">
              {formatMessage(
                {
                  id: 'Settings.roles.form.mfa.hint',
                  defaultMessage:
                    'Users with this role must set up two-factor authentication within {days, plural, one {# day} other {# days}} of their next login.',
                },
                { days: mfa.graceDays }
              )}
            </Typography>
          ) : null}
          <Typography id={explanationId} variant="pi" textColor="neutral600">
            {explanation}
          </Typography>
        </Flex>
      </Flex>

      <Dialog.Root open={impact !== null} onOpenChange={(open) => !open && setImpact(null)}>
        {impact !== null ? (
          <ConfirmDialog
            title={formatMessage({
              id: 'Settings.security.mfa.enforce.title',
              defaultMessage: 'Require two-factor authentication?',
            })}
            variant="default"
            endAction={
              <Dialog.Action>
                <Button fullWidth variant="default" onClick={confirmRaise}>
                  {formatMessage({
                    id: 'Settings.security.mfa.enforce.confirm',
                    defaultMessage: 'Require',
                  })}
                </Button>
              </Dialog.Action>
            }
          >
            <EnforceImpactMessage impact={impact} graceDays={mfa.graceDays} />
          </ConfirmDialog>
        ) : null}
      </Dialog.Root>

      <ConfirmDowngradeDialog
        open={lowering}
        requiresCode={callerEnrolled}
        onClose={() => setLowering(false)}
        onConfirm={confirmLower}
        description={
          <Typography>
            {roleName
              ? formatMessage(
                  {
                    id: 'Settings.security.downgrade.combined.roles',
                    defaultMessage:
                      'Two-factor authentication will no longer be required for {roles}.',
                  },
                  { roles: roleName }
                )
              : formatMessage({
                  id: 'Settings.roles.form.mfa.lower.thisRole',
                  defaultMessage:
                    'Two-factor authentication will no longer be required for this role.',
                })}
          </Typography>
        }
      />
    </Box>
  );
};

export { RoleTwoFactorRequirement };
export type { RoleTwoFactorRequirementProps };
