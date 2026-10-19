import * as React from 'react';

import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../features/Notifications';
import { useToMessage } from '../../../../../hooks/useToMessage';
import { useUpdateSecuritySettingsMutation } from '../../../../../services/securitySettings';

import type { UpdateSecuritySettings } from '../../../../../../../shared/contracts/security-settings';
import type { DowngradeCredentials } from '../components/ConfirmDowngradeDialog';

interface UseSecuritySettingsSaveOptions {
  /**
   * Exactly one of the three keys: the endpoint replaces whatever object it is given, whole.
   * Not typed as "exactly one of", because a computed property over a union of literal keys widens
   * to an index signature and would not assign at all.
   */
  patch: Pick<UpdateSecuritySettings.Request['body'], 'mfa' | 'trustedDevices' | 'passkeys'>;
  /** The server is the authority and refuses a downgrade sent without credentials; this only
   * decides whether to ask for them first. */
  requiresCredentials: boolean;
  /** Returning `false` cancels the save; the card must have shown its own message. */
  validate?: () => boolean;
}

interface UseSecuritySettingsSaveResult {
  save: () => Promise<void>;
  isSaving: boolean;
  saveError?: string;
  downgradeOpen: boolean;
  closeDowngrade: () => void;
  /** Resolves `undefined` on success, or the message to show -- in which case the dialog stays open
   * with the password kept. */
  confirmDowngrade: (credentials: DowngradeCredentials) => Promise<string | undefined>;
}

/** What varies between cards is the body key, the validation, and which predicate decides "needs
 * credentials". All three are inputs. */
const useSecuritySettingsSave = ({
  patch,
  requiresCredentials,
  validate,
}: UseSecuritySettingsSaveOptions): UseSecuritySettingsSaveResult => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSecuritySettingsMutation();
  const [saveError, setSaveError] = React.useState<string>();
  const [downgradeOpen, setDowngradeOpen] = React.useState(false);

  const submit = async (credentials?: DowngradeCredentials): Promise<string | undefined> => {
    const res = await updateSettings({ ...patch, ...credentials });
    if ('error' in res) {
      return toMessage(res.error);
    }
    toggleNotification({
      type: 'success',
      message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
    });
    return undefined;
  };

  const save = async () => {
    setSaveError(undefined);
    if (validate && !validate()) {
      return;
    }

    if (requiresCredentials) {
      setDowngradeOpen(true);
      return;
    }

    const message = await submit();
    if (message) {
      setSaveError(message);
    }
  };

  const confirmDowngrade = async (credentials: DowngradeCredentials) => {
    const message = await submit(credentials);
    if (!message) {
      setDowngradeOpen(false);
    }
    return message;
  };

  return {
    save,
    isSaving,
    saveError,
    downgradeOpen,
    closeDowngrade: () => setDowngradeOpen(false),
    confirmDowngrade,
  };
};

export { useSecuritySettingsSave };
export type { UseSecuritySettingsSaveOptions, UseSecuritySettingsSaveResult };
