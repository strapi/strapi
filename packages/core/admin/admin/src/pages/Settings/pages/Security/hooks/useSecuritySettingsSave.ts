import * as React from 'react';

import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../features/Notifications';
import { useMfaErrorMessage } from '../../../../../hooks/useMfaErrorMessage';
import {
  useLazyGetMfaImpactQuery,
  useLazyGetPasskeysImpactQuery,
  useUpdateSecuritySettingsMutation,
} from '../../../../../services/securitySettings';
import {
  isEnforcementRaise,
  isPasskeysDisable,
  isSecurityDowngrade,
  isTrustedDevicesDowngrade,
  requiresPasskeysCredentials,
} from '../utils/isSecurityDowngrade';

import type {
  MfaEnforcementSettings,
  SecuritySettings,
  UpdateSecuritySettings,
} from '../../../../../../../shared/contracts/security-settings';
import type { DowngradeCredentials } from '../components/ConfirmDowngradeDialog';

type SecuritySection = keyof SecuritySettings;

interface UseSecuritySettingsSaveOptions {
  /** What the server holds. */
  settings: SecuritySettings;
  /** The page's draft, already well-formed (an empty number field reads as the stored value). */
  next: SecuritySettings;
  /** `/admin/mfa/me` `hasLocalPassword`; see `requiresPasskeysCredentials`. */
  hasLocalPassword: boolean;
  /** Returning `false` cancels the save; the page must have shown its own field errors. */
  validate?: () => boolean;
}

/** Which kinds of downgrade a save contains; each one is a reason the server wants credentials. */
interface DowngradeKinds {
  lowersEnforcement: boolean;
  widensTrust: boolean;
  disablesPasskeys: boolean;
}

interface SaveError {
  /** The card the message belongs to, or `page` when the save touched several. */
  section: SecuritySection | 'page';
  message: string;
}

interface UseSecuritySettingsSaveResult {
  changed: Record<SecuritySection, boolean>;
  modified: boolean;
  save: () => Promise<void>;
  isSaving: boolean;
  saveError?: SaveError;
  /** The blast radius of a raise, while its confirmation is open. */
  impact: { affected: number; enrolled: number } | null;
  closeImpact: () => void;
  confirmRaise: () => Promise<void>;
  /** Set while the downgrade confirmation is open. */
  downgrade: (DowngradeKinds & { requiresCredentials: boolean }) | null;
  /** How many passkeys turning them off deletes; `undefined` while loading or after an error. */
  passkeysCount?: number;
  closeDowngrade: () => void;
  /** Resolves `undefined` on success, or the message to show -- in which case the dialog stays open
   * with the password kept. */
  confirmDowngrade: (credentials?: DowngradeCredentials) => Promise<string | undefined>;
}

/** The server returns roles in its own order, which must not read as an unsaved change. These are
 * opaque ids, so the comparator only has to be the same on both sides. */
const byRoleId = (a: string, b: string) => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const normaliseMfa = (mfa: MfaEnforcementSettings): MfaEnforcementSettings => ({
  ...mfa,
  requiredRoles: [...mfa.requiredRoles].sort(byRoleId),
});

/**
 * The single save of the Security page. `PUT /admin/security-settings` is per object: a key in the
 * body replaces that object whole, an absent one is left as stored. So the body carries only the
 * objects the draft changed, and one request saves the whole page.
 *
 * Two confirmations may stand between Save and the request, in this order:
 * 1. a raise of enforcement (`isEnforcementRaise`) shows its blast radius first;
 * 2. any downgrade -- lowering enforcement, widening trust, turning passkeys off -- opens one
 *    credential dialog for all of them. The server is the authority and refuses a downgrade sent
 *    without credentials; this only decides whether to ask for them first.
 */
const useSecuritySettingsSave = ({
  settings,
  next,
  hasLocalPassword,
  validate,
}: UseSecuritySettingsSaveOptions): UseSecuritySettingsSaveResult => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useMfaErrorMessage();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSecuritySettingsMutation();
  const [fetchImpact, { isFetching: isFetchingImpact }] = useLazyGetMfaImpactQuery();
  const [fetchPasskeysImpact] = useLazyGetPasskeysImpactQuery();

  const [saveError, setSaveError] = React.useState<SaveError>();
  const [impact, setImpact] = React.useState<{ affected: number; enrolled: number } | null>(null);
  const [downgradeOpen, setDowngradeOpen] = React.useState(false);
  const [passkeysCount, setPasskeysCount] = React.useState<number>();

  const changed: Record<SecuritySection, boolean> = {
    mfa: !isEqual(normaliseMfa(next.mfa), normaliseMfa(settings.mfa)),
    trustedDevices: !isEqual(next.trustedDevices, settings.trustedDevices),
    passkeys: next.passkeys.enabled !== settings.passkeys.enabled,
  };
  const changedSections = (Object.keys(changed) as SecuritySection[]).filter((key) => changed[key]);
  const errorSection: SaveError['section'] =
    changedSections.length === 1 ? changedSections[0] : 'page';

  const kinds: DowngradeKinds = {
    lowersEnforcement: changed.mfa && isSecurityDowngrade(settings.mfa, next.mfa),
    widensTrust:
      changed.trustedDevices &&
      isTrustedDevicesDowngrade(settings.trustedDevices, next.trustedDevices),
    disablesPasskeys: isPasskeysDisable(settings.passkeys, next.passkeys),
  };
  const isDowngrade = kinds.lowersEnforcement || kinds.widensTrust || kinds.disablesPasskeys;
  // An SSO-only administrator is let through without credentials only when turning passkeys off
  // is the one downgrade in the save -- the same rule the server applies.
  const requiresCredentials = requiresPasskeysCredentials(
    hasLocalPassword,
    kinds.disablesPasskeys,
    kinds.lowersEnforcement,
    kinds.widensTrust
  );

  const submit = async (credentials?: DowngradeCredentials): Promise<string | undefined> => {
    const body: UpdateSecuritySettings.Request['body'] = { ...credentials };
    changedSections.forEach((section) => {
      Object.assign(body, { [section]: next[section] });
    });

    const res = await updateSettings(body);
    if ('error' in res) {
      return toMessage(res.error);
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'Settings.security.saved',
        defaultMessage: 'Security settings saved.',
      }),
    });
    return undefined;
  };

  /** Everything after the raise confirmation: the credential dialog, or the request itself. */
  const proceed = async () => {
    if (isDowngrade) {
      setPasskeysCount(undefined);
      setDowngradeOpen(true);
      if (kinds.disablesPasskeys) {
        const res = await fetchPasskeysImpact();
        // Left `undefined` on an error: the dialog then says "all passkeys" without a number.
        setPasskeysCount(res.data?.count);
      }
      return;
    }

    const message = await submit();
    if (message) {
      setSaveError({ section: errorSection, message });
    }
  };

  const save = async () => {
    setSaveError(undefined);
    if (changedSections.length === 0 || (validate && !validate())) {
      return;
    }

    if (changed.mfa && isEnforcementRaise(settings.mfa, next.mfa)) {
      const res = await fetchImpact({ mode: next.mfa.mode, requiredRoles: next.mfa.requiredRoles });
      if (res.error) {
        setSaveError({ section: 'mfa', message: toMessage(res.error) });
        return;
      }
      if (res.data) {
        setImpact(res.data);
      }
      return;
    }

    await proceed();
  };

  const confirmRaise = async () => {
    setImpact(null);
    await proceed();
  };

  const confirmDowngrade = async (credentials?: DowngradeCredentials) => {
    const message = await submit(credentials);
    if (!message) {
      setDowngradeOpen(false);
    }
    return message;
  };

  return {
    changed,
    modified: changedSections.length > 0,
    save,
    isSaving: isSaving || isFetchingImpact,
    saveError,
    impact,
    closeImpact: () => setImpact(null),
    confirmRaise,
    downgrade: downgradeOpen ? { ...kinds, requiresCredentials } : null,
    passkeysCount,
    closeDowngrade: () => setDowngradeOpen(false),
    confirmDowngrade,
  };
};

export { useSecuritySettingsSave };
export type {
  DowngradeKinds,
  SaveError,
  SecuritySection,
  UseSecuritySettingsSaveOptions,
  UseSecuritySettingsSaveResult,
};
