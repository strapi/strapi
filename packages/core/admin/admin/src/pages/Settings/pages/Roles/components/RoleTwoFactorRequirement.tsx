import * as React from 'react';

import { Box, Button, Dialog, Field, Flex, Toggle, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../../components/ConfirmDialog';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useAuth } from '../../../../../features/Auth';
import { useNotification } from '../../../../../features/Notifications';
import { useRBAC } from '../../../../../hooks/useRBAC';
import { useToMessage } from '../../../../../hooks/useToMessage';
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
import { isEnforcementRaise, isSecurityDowngrade } from '../../Security/utils/isSecurityDowngrade';

import type { MfaEnforcementSettings } from '../../../../../../../shared/contracts/security-settings';

interface RoleTwoFactorRequirementProps {
  roleId: string | number;
}

/**
 * "Require two-factor authentication" on the role edit page: the role's `admin::role.mfaRequired`
 * flag, which is owned by the security settings and written through `PUT /admin/security-settings`
 * (`mfa.requiredRoles`), never through the role endpoints. The toggle saves on its own, apart from
 * the role form's Save, and with the Security page's confirmations: requiring it shows how many
 * users it puts on the clock, and dropping it asks for the caller's password (and a code when the
 * caller is enrolled), because the server refuses a lowered requirement without them.
 *
 * Shown only to a caller who may read and update the security settings, and only while the feature
 * is on: a 404 from `GET /admin/security-settings` is the feature-off signal, as on the Security
 * page. While nothing is required, turning it on moves the mode to "Required for selected roles"
 * with this role alone, and turning off the last required role moves it back to "Not required".
 * While everyone is required the toggle shows the effective state, disabled, and says where it is
 * set.
 */
const RoleTwoFactorRequirement = ({ roleId }: RoleTwoFactorRequirementProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
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

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = nextFor(event.target.checked);

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

  let hint: string;
  if (everyone) {
    hint = formatMessage({
      id: 'Settings.roles.form.mfa.hint.everyone',
      defaultMessage: 'Required for everyone in Settings > Security.',
    });
  } else if (mustEnrolFirst) {
    hint = formatMessage({
      id: 'Settings.security.mfa.enrolFirst',
      defaultMessage:
        'Set up two-factor authentication on your own account before requiring it for others.',
    });
  } else if (mfa.mode === 'off') {
    hint = formatMessage({
      id: 'Settings.roles.form.mfa.hint.off',
      defaultMessage:
        'Not required for any role yet. Turn this on to require it for users with this role.',
    });
  } else {
    hint = formatMessage(
      {
        id: 'Settings.roles.form.mfa.hint',
        defaultMessage:
          'Users with this role must set up two-factor authentication within {days, plural, one {# day} other {# days}} of their next login.',
      },
      { days: mfa.graceDays }
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
        <Field.Root name="mfaRequired" hint={hint} maxWidth="320px">
          <Field.Label>
            {formatMessage({
              id: 'Settings.roles.form.mfa.label',
              defaultMessage: 'Require two-factor authentication',
            })}
          </Field.Label>
          <Toggle
            checked={checked}
            disabled={everyone || mustEnrolFirst || isSaving || isFetching || isFetchingImpact}
            onLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.enabled-label',
              defaultMessage: 'Enabled',
            })}
            offLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.disabled-label',
              defaultMessage: 'Disabled',
            })}
            onChange={handleChange}
          />
          <Field.Hint />
        </Field.Root>
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
            {impact.affected === 0
              ? formatMessage({
                  id: 'Settings.security.mfa.enforce.none',
                  defaultMessage:
                    'Nobody new will be asked to set up two-factor authentication: this change adds no active user who logs in with a password.',
                })
              : formatMessage(
                  {
                    id: 'Settings.security.mfa.enforce.body',
                    defaultMessage:
                      '{affected, plural, one {# user} other {# users}} will be asked to set up two-factor authentication, and {enrolled, plural, =0 {none of them has} one {# of them already has} other {# of them already have}} it. Each has {graceDays, plural, one {# day} other {# days}} from their next login to set it up. After that, password login is locked until an administrator unlocks the account.',
                  },
                  {
                    affected: impact.affected,
                    enrolled: impact.enrolled,
                    graceDays: mfa.graceDays,
                  }
                )}
          </ConfirmDialog>
        ) : null}
      </Dialog.Root>

      <ConfirmDowngradeDialog
        open={lowering}
        requiresCode={callerEnrolled}
        onClose={() => setLowering(false)}
        onConfirm={confirmLower}
      />
    </Box>
  );
};

export { RoleTwoFactorRequirement };
export type { RoleTwoFactorRequirementProps };
