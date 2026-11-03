import * as React from 'react';

import { Box, Button, Dialog, EmptyStateLayout, Flex, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { EmptyPermissions } from '@strapi/icons/symbols';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';

import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { ErrorMessage } from '../../../../components/ErrorMessage';
import { UnsavedChangesBlocker } from '../../../../components/Form';
import { Layouts } from '../../../../components/Layouts/Layout';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useAuth } from '../../../../features/Auth';
import { type AdminRole, useAdminRoles } from '../../../../hooks/useAdminRoles';
import { useRBAC } from '../../../../hooks/useRBAC';
import { selectAdminPermissions } from '../../../../selectors';
import { useGetMfaStatusQuery } from '../../../../services/mfa';
import { useGetSecuritySettingsQuery } from '../../../../services/securitySettings';
import { isNotFoundError } from '../../../../utils/baseQuery';

import { ConfirmDowngradeDialog } from './components/ConfirmDowngradeDialog';
import { PasskeysCard } from './components/PasskeysCard';
import {
  TrustedDevicesCard,
  type TrustedDevicesDraft,
  isValidDays,
} from './components/TrustedDevicesCard';
import {
  GRACE_MAX,
  GRACE_MIN,
  type MfaEnforcementDraft,
  TwoFactorEnforcementCard,
  isValidGraceDays,
} from './components/TwoFactorEnforcementCard';
import { useSecuritySettingsSave } from './hooks/useSecuritySettingsSave';
import { enforcedRoleIds } from './utils/isSecurityDowngrade';

import type {
  PasskeySettings,
  SecuritySettings,
} from '../../../../../../shared/contracts/security-settings';

/**
 * A draft of one stored object. A refetch adopts fresh server data only while the draft still
 * matches the baseline it was taken from: an edit in progress is kept rather than silently thrown
 * away, which is what happened when another administrator saved while this one was typing.
 */
const useBaselineDraft = <TStored extends TDraft, TDraft>(stored: TStored) => {
  const [draft, setDraft] = React.useState<TDraft>(stored);
  const baselineRef = React.useRef(stored);

  React.useEffect(() => {
    const baseline = baselineRef.current;
    baselineRef.current = stored;
    setDraft((current) => (isEqual(current, baseline) ? stored : current));
  }, [stored]);

  return [draft, setDraft] as const;
};

interface FieldErrors {
  graceDays?: string;
  requiredRoles?: string;
  trustDays?: string;
}

interface SecuritySettingsFormProps {
  settings: SecuritySettings;
  roles: AdminRole[];
  canUpdate: boolean;
  /** `/admin/mfa/me` `enabled` for the caller: decides whether a downgrade also needs a code. */
  callerEnrolled: boolean;
  /**
   * `/admin/mfa/me` `hasLocalPassword`. An account with no password is exempt from enforcement (so
   * the enrol-first guard never applies to it) and may turn passkeys off without credentials.
   */
  callerHasLocalPassword: boolean;
  /** The caller's own role ids, to tell whether a role being required includes one they hold. */
  callerRoleIds: string[];
  /**
   * `isFetching` of the `SecuritySettings` query, while it refetches after a save. Keeps Save
   * disabled through the gap between the mutation fulfilling and the refetched `settings` catching
   * up to the draft, which would otherwise let a fast second click re-submit the same body.
   */
  isRefreshing: boolean;
}

/**
 * The loaded page: one draft of all three objects, one Save in the header, one request.
 */
const SecuritySettingsForm = ({
  settings,
  roles,
  canUpdate,
  callerEnrolled,
  callerHasLocalPassword,
  callerRoleIds,
  isRefreshing,
}: SecuritySettingsFormProps) => {
  const { formatMessage } = useIntl();

  const [mfaDraft, setMfaDraft] = useBaselineDraft<SecuritySettings['mfa'], MfaEnforcementDraft>(
    settings.mfa
  );
  const [trustDraft, setTrustDraft] = useBaselineDraft<
    SecuritySettings['trustedDevices'],
    TrustedDevicesDraft
  >(settings.trustedDevices);
  const [passkeysDraft, setPasskeysDraft] = useBaselineDraft<
    SecuritySettings['passkeys'],
    PasskeySettings
  >(settings.passkeys);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});

  // An empty number field reads as the stored value, so the downgrade predicates never see the
  // empty state and never mistake it for a lengthened period. `validate()` below is what actually
  // refuses the save; this only keeps `next` a well-formed settings object.
  const next: SecuritySettings = {
    mfa: { ...mfaDraft, graceDays: mfaDraft.graceDays ?? settings.mfa.graceDays },
    trustedDevices: { ...trustDraft, days: trustDraft.days ?? settings.trustedDevices.days },
    passkeys: passkeysDraft,
  };

  const validate = () => {
    const errors: FieldErrors = {};
    if (changed.mfa && mfaDraft.mode === 'optional' && mfaDraft.requiredRoles.length === 0) {
      errors.requiredRoles = formatMessage({
        id: 'Settings.security.mfa.roles.error',
        defaultMessage: 'Select at least one role.',
      });
    }
    if (mfaDraft.mode !== 'off' && !isValidGraceDays(mfaDraft.graceDays)) {
      errors.graceDays = formatMessage(
        {
          id: 'Settings.security.mfa.graceDays.error',
          defaultMessage: 'Enter a whole number of days between {min} and {max}',
        },
        { min: GRACE_MIN, max: GRACE_MAX }
      );
    }
    if (trustDraft.enabled && !isValidDays(trustDraft.days)) {
      errors.trustDays = formatMessage({
        id: 'Settings.security.trustedDevices.days.error',
        defaultMessage: 'Enter a whole number of days between 1 and 90',
      });
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const {
    changed,
    modified,
    save,
    isSaving,
    saveError,
    impact,
    closeImpact,
    confirmRaise,
    downgrade,
    passkeysCount,
    closeDowngrade,
    confirmDowngrade,
  } = useSecuritySettingsSave({
    settings,
    next,
    hasLocalPassword: callerHasLocalPassword,
    validate,
  });

  /**
   * The server refuses to require two-factor authentication of a caller who has none: the most
   * obvious self-lockout. The same rule is evaluated here so the refusal arrives as a next step,
   * before the click -- the server stays the authority.
   */
  const addsHeldRole = next.mfa.requiredRoles.some(
    (id) => !enforcedRoleIds(settings.mfa).includes(id) && callerRoleIds.includes(id)
  );
  const mustEnrolFirst =
    changed.mfa &&
    !callerEnrolled &&
    callerHasLocalPassword &&
    ((next.mfa.mode === 'required' && settings.mfa.mode !== 'required') ||
      (next.mfa.mode === 'optional' && addsHeldRole));

  const handleMfaChange = (changes: MfaEnforcementDraft) => {
    // A field that is hidden goes back to its stored value, so a choice the user can no longer
    // see is never saved behind their back: the role picker shows only under "Required for
    // selected roles", the grace period only while something is required.
    const value: MfaEnforcementDraft = {
      ...changes,
      requiredRoles:
        changes.mode === 'optional' ? changes.requiredRoles : settings.mfa.requiredRoles,
      graceDays: changes.mode === 'off' ? settings.mfa.graceDays : changes.graceDays,
    };
    setMfaDraft(value);
    setFieldErrors(({ graceDays, requiredRoles, ...rest }) => ({
      ...rest,
      graceDays: value.graceDays === mfaDraft.graceDays ? graceDays : undefined,
      requiredRoles: isEqual(value.requiredRoles, mfaDraft.requiredRoles)
        ? requiredRoles
        : undefined,
    }));
  };

  const handleTrustChange = (value: TrustedDevicesDraft) => {
    // The days field is disabled while trust is off, so a value it holds from before unticking
    // (invalid or not) must never be able to block saving `enabled: false`.
    setTrustDraft(value.enabled ? value : { enabled: false, days: settings.trustedDevices.days });
    setFieldErrors((errors) => ({ ...errors, trustDays: undefined }));
  };

  const sectionError = (section: 'mfa' | 'trustedDevices' | 'passkeys') =>
    saveError?.section === section ? saveError.message : undefined;

  return (
    <>
      <Layouts.Header
        title={formatMessage({ id: 'Settings.security.title', defaultMessage: 'Security' })}
        subtitle={formatMessage({
          id: 'Settings.security.description',
          defaultMessage: 'Security requirements for everyone who uses this admin panel.',
        })}
        primaryAction={
          <Button
            startIcon={<Check />}
            onClick={save}
            loading={isSaving}
            disabled={!canUpdate || !modified || isRefreshing || mustEnrolFirst}
          >
            {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
          </Button>
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={7}>
          {saveError?.section === 'page' ? <ErrorMessage error={saveError.message} /> : null}
          <TwoFactorEnforcementCard
            value={mfaDraft}
            onChange={handleMfaChange}
            roles={roles}
            canUpdate={canUpdate}
            errors={{ graceDays: fieldErrors.graceDays, requiredRoles: fieldErrors.requiredRoles }}
            saveError={sectionError('mfa')}
            mustEnrolFirst={mustEnrolFirst}
          />
          <TrustedDevicesCard
            value={trustDraft}
            onChange={handleTrustChange}
            canUpdate={canUpdate}
            daysError={fieldErrors.trustDays}
            saveError={sectionError('trustedDevices')}
          />
          <PasskeysCard
            value={passkeysDraft}
            onChange={setPasskeysDraft}
            canUpdate={canUpdate}
            saveError={sectionError('passkeys')}
          />
        </Flex>
      </Layouts.Content>

      <Dialog.Root open={impact !== null} onOpenChange={(open) => !open && closeImpact()}>
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
                    'No active user logs in with a password under this setting, so nobody will be asked to set it up yet.',
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
                    graceDays: next.mfa.graceDays,
                  }
                )}
          </ConfirmDialog>
        ) : null}
      </Dialog.Root>

      <SecurityDowngradeDialog
        downgrade={downgrade}
        passkeysCount={passkeysCount}
        callerEnrolled={callerEnrolled}
        onClose={closeDowngrade}
        onConfirm={confirmDowngrade}
      />

      <UnsavedChangesBlocker modified={modified} isSubmitting={isSaving || isRefreshing} />
    </>
  );
};

interface SecurityDowngradeDialogProps {
  downgrade: ReturnType<typeof useSecuritySettingsSave>['downgrade'];
  passkeysCount?: number;
  callerEnrolled: boolean;
  onClose: () => void;
  onConfirm: React.ComponentProps<typeof ConfirmDowngradeDialog>['onConfirm'];
}

/**
 * Picks the copy of the one credential dialog. A save that contains a single kind of downgrade
 * uses that kind's title and button; one that combines several says what each of them does.
 */
const SecurityDowngradeDialog = ({
  downgrade,
  passkeysCount,
  callerEnrolled,
  onClose,
  onConfirm,
}: SecurityDowngradeDialogProps) => {
  const { formatMessage } = useIntl();

  const passkeysSentence =
    passkeysCount === undefined
      ? formatMessage({
          id: 'Settings.security.passkeys.disable.description',
          defaultMessage: 'This deletes all passkeys your users registered. This cannot be undone.',
        })
      : formatMessage(
          {
            id: 'Settings.security.passkeys.disable.count',
            defaultMessage:
              '{count, plural, =0 {No user has registered a passkey yet.} one {This deletes the # passkey your users registered. This cannot be undone.} other {This deletes all # passkeys your users registered. This cannot be undone.}}',
          },
          { count: passkeysCount }
        );

  const kinds = downgrade
    ? [downgrade.lowersEnforcement, downgrade.widensTrust, downgrade.disablesPasskeys].filter(
        Boolean
      ).length
    : 0;

  let title: string | undefined;
  let description: React.ReactNode;
  let confirmLabel: string | undefined;

  if (downgrade && kinds > 1) {
    title = formatMessage({
      id: 'Settings.security.downgrade.combined.title',
      defaultMessage: 'Lower security settings?',
    });
    description = (
      <Flex direction="column" alignItems="stretch" gap={2}>
        {downgrade.lowersEnforcement ? (
          <Typography>
            {formatMessage({
              id: 'Settings.security.downgrade.combined.mfa',
              defaultMessage: 'This lowers two-factor requirements.',
            })}
          </Typography>
        ) : null}
        {downgrade.widensTrust ? (
          <Typography>
            {formatMessage({
              id: 'Settings.security.downgrade.combined.trustedDevices',
              defaultMessage: 'Trusted browsers will skip the code for longer.',
            })}
          </Typography>
        ) : null}
        {downgrade.disablesPasskeys ? <Typography>{passkeysSentence}</Typography> : null}
      </Flex>
    );
    confirmLabel = formatMessage({ id: 'global.save', defaultMessage: 'Save' });
  } else if (downgrade?.widensTrust) {
    title = formatMessage({
      id: 'Settings.security.trustedDevices.widen.title',
      defaultMessage: 'Let browsers skip the code for longer?',
    });
    confirmLabel = formatMessage({ id: 'global.save', defaultMessage: 'Save' });
  } else if (downgrade?.disablesPasskeys) {
    title = formatMessage({
      id: 'Settings.security.passkeys.disable.title',
      defaultMessage: 'Turn passkeys off?',
    });
    description = <Typography>{passkeysSentence}</Typography>;
    confirmLabel = formatMessage({
      id: 'Settings.security.passkeys.disable.confirm',
      defaultMessage: 'Turn off',
    });
  }

  return (
    <ConfirmDowngradeDialog
      open={downgrade !== null}
      requiresPassword={downgrade?.requiresCredentials ?? true}
      requiresCode={callerEnrolled}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
    />
  );
};

/**
 * Settings > Administration Panel > Security. A generic home for security settings; its cards are
 * two-factor enforcement (`TwoFactorEnforcementCard`), trusted devices (`TrustedDevicesCard`) and
 * passkeys (`PasskeysCard`); each is an accessible region named by its own heading. The page owns
 * one draft of all three and saves it with the one Save in its header. The settings link is the
 * one place that reads the future flag; this page keys off the API instead: a 404 from
 * `/admin/security-settings` means the feature is off (kill switch or flag), and it renders a
 * disabled-feature state rather than an empty form.
 *
 * Role names need `admin::roles.read` on top of `admin::security-settings.read`; without it the
 * card renders with an empty role list (the server still enforces role ids on save).
 */
const SecurityPage = () => {
  const { formatMessage } = useIntl();
  const permissions = useTypedSelector(selectAdminPermissions);

  const {
    isLoading: isLoadingRBAC,
    allowedActions: { canUpdate, canRead: canReadRoles },
  } = useRBAC({
    update: permissions.settings?.security?.update ?? [],
    readRoles: permissions.settings?.roles.read ?? [],
  });

  const {
    data: settings,
    error,
    isLoading: isLoadingSettings,
    isFetching: isFetchingSettings,
  } = useGetSecuritySettingsQuery();
  const {
    roles,
    isLoading: isLoadingRoles,
    isUninitialized: isUninitializedRoles,
  } = useAdminRoles(undefined, { skip: !canReadRoles });
  // The caller's own enrolment decides whether a downgrade needs a code; a 404 here is the same
  // feature-off signal and simply reads as "not enrolled".
  const { data: mfaStatus } = useGetMfaStatusQuery();
  const callerRoleIds = useAuth('SecurityPage', (state) =>
    (state.user?.roles ?? []).map((role) => String(role.id))
  );

  const isFeatureOff = isNotFoundError(error);
  // While `canReadRoles` is true, the roles query starts out uninitialized (its `isLoading` is
  // false) for the render where RBAC first resolves, which would otherwise paint the card with an
  // empty role list for one frame before the roles request even starts.
  const isLoading =
    isLoadingRBAC ||
    isLoadingSettings ||
    (canReadRoles && (isLoadingRoles || isUninitializedRoles));

  const header = (
    <Layouts.Header
      title={formatMessage({ id: 'Settings.security.title', defaultMessage: 'Security' })}
      subtitle={formatMessage({
        id: 'Settings.security.description',
        defaultMessage: 'Security requirements for everyone who uses this admin panel.',
      })}
    />
  );

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          { name: 'Security' }
        )}
      </Page.Title>
      {isLoading ? (
        <>
          {header}
          <Layouts.Content>
            <Page.Loading />
          </Layouts.Content>
        </>
      ) : isFeatureOff ? (
        <>
          {header}
          <Layouts.Content>
            <Box background="neutral0" hasRadius shadow="filterShadow">
              <EmptyStateLayout
                icon={<EmptyPermissions width="16rem" />}
                content={formatMessage({
                  id: 'Settings.security.mfa.disabled',
                  defaultMessage:
                    'Two-factor authentication is turned off on this instance (admin.auth.mfa.enabled in the admin configuration). Turn it on to manage its requirements here.',
                })}
              />
            </Box>
          </Layouts.Content>
        </>
      ) : error || !settings ? (
        <>
          {header}
          <Layouts.Content>
            <Page.Error />
          </Layouts.Content>
        </>
      ) : (
        <SecuritySettingsForm
          settings={settings}
          roles={roles}
          canUpdate={canUpdate}
          callerEnrolled={Boolean(mfaStatus?.enabled)}
          callerHasLocalPassword={mfaStatus ? mfaStatus.hasLocalPassword : true}
          callerRoleIds={callerRoleIds}
          isRefreshing={isFetchingSettings}
        />
      )}
    </Page.Main>
  );
};

const ProtectedSecurityPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.security?.main
  );

  return (
    <Page.Protect permissions={permissions}>
      <SecurityPage />
    </Page.Protect>
  );
};

export { SecurityPage, ProtectedSecurityPage };
