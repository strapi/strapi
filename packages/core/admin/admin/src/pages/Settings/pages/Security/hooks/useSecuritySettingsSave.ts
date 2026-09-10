import * as React from 'react';

import { useIntl } from 'react-intl';

import { useNotification } from '../../../../../features/Notifications';
import { useToMessage } from '../../../../../hooks/useToMessage';
import { useUpdateSecuritySettingsMutation } from '../../../../../services/securitySettings';

import type { UpdateSecuritySettings } from '../../../../../../../shared/contracts/security-settings';
import type { DowngradeCredentials } from '../components/ConfirmDowngradeDialog';

interface UseSecuritySettingsSaveOptions {
  /**
   * This card's slice of the `PUT` body -- exactly one of `mfa`, `trustedDevices` or `passkeys`.
   * The endpoint is per object: whatever key it is given replaces that object whole and the others
   * are left untouched, so a card must never send a key that is not its own.
   *
   * Typed as the three optional keys rather than "exactly one of" on purpose: a computed property
   * built from a union of literal keys widens to an index signature in TypeScript and would not
   * assign to the body type at all. The invariant is documented here and honoured by the three
   * call sites; the worst a breach could do is save two objects in one request, which the server
   * accepts anyway.
   */
  patch: Pick<UpdateSecuritySettings.Request['body'], 'mfa' | 'trustedDevices' | 'passkeys'>;
  /**
   * Whether this particular change needs the caller's password (plus a code when they are
   * enrolled) before the server will accept it -- `isSecurityDowngrade`, `isTrustedDevicesDowngrade`
   * or `isPasskeysDisable`, evaluated by the card. The server is the authority and refuses such a
   * change sent without credentials; this only decides whether to ask for them first.
   */
  requiresCredentials: boolean;
  /**
   * Card-local validation, run before anything is sent. Returning `false` cancels the save; the
   * card is responsible for having shown its own inline message (the two numeric fields do).
   */
  validate?: () => boolean;
}

interface UseSecuritySettingsSaveResult {
  /** The Save button's handler. */
  save: () => Promise<void>;
  isSaving: boolean;
  /** A refusal from the credential-free path, to render under the card's own controls. */
  saveError?: string;
  downgradeOpen: boolean;
  closeDowngrade: () => void;
  /**
   * `ConfirmDowngradeDialog`'s `onConfirm`: resolves `undefined` on success (and closes the
   * dialog) or the message to show, in which case the dialog stays open with the password kept.
   */
  confirmDowngrade: (credentials: DowngradeCredentials) => Promise<string | undefined>;
}

/**
 * The save flow every card on the Security page shares: one per-object `PUT`, a "Saved" toast, an
 * inline refusal message, and the re-authentication dialog for a change that lowers protection.
 *
 * Extracted once the third card would have been the third copy of the same ~35 lines. What
 * varies between cards is the body key, the validation, and which predicate decides "needs
 * credentials", and all three are inputs.
 */
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
