import * as React from 'react';

import { Typography, type ButtonProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../../../../components/ErrorMessage';
import { FormConfirmDialog } from '../../../../../components/FormConfirmDialog';
import { CredentialFields } from '../../../../Profile/CredentialFields';

interface DowngradeCredentials {
  password: string;
  /** Present only when the caller is enrolled (a TOTP code or an unused recovery code). */
  code?: string;
}

interface ConfirmDowngradeDialogProps {
  open: boolean;
  /**
   * `false` only for the one change the server lets an SSO-only administrator make on session
   * authority: turning passkeys off and nothing else. The dialog then confirms without fields.
   */
  requiresPassword?: boolean;
  /** `true` when the caller is enrolled: the server then requires a second-factor code too. */
  requiresCode: boolean;
  onClose: () => void;
  /**
   * Performs the save with the collected credentials (`undefined` when `requiresPassword` is
   * false). Resolves `undefined` on success (the parent then closes the dialog) or a message to
   * show, in which case the dialog stays open with the password kept so only the code needs
   * retyping.
   */
  onConfirm: (credentials?: DowngradeCredentials) => Promise<string | undefined>;
  /** Overrides the heading, which by default names lowering two-factor requirements. */
  title?: string;
  /**
   * What the save is about to do, shown above the credential prompt. The page passes the copy of
   * the kind of downgrade it is (or of each, when a save combines several).
   */
  description?: React.ReactNode;
  /** Overrides the confirm button, "Lower requirements" by default. */
  confirmLabel?: string;
  /** The confirm button's variant: `danger-light`, like `ConfirmDialog`, by default. */
  variant?: ButtonProps['variant'];
  /** The colour the warning icon takes once the fields are filled: red by default. */
  iconTone?: 'danger' | 'primary';
}

/**
 * Re-authentication for a security downgrade on the Security settings page: lowering two-factor
 * enforcement (`isSecurityDowngrade`), letting browsers skip the code for longer
 * (`isTrustedDevicesDowngrade`) or turning passkeys off (`isPasskeysDisable`). The page saves all
 * three objects with one `PUT`, so one dialog covers whichever of them a save contains. The server
 * refuses such a change without the caller's password, plus a current code when the caller is
 * enrolled.
 *
 * Deliberately not `ReAuthDialog`: that one is bound to the regenerate/disable
 * mutations and always requires a code, while an *unenrolled* administrator may lower protection
 * with the password alone. This component owns no mutation; the page hands it the save.
 *
 * Same submission mechanics as `ReAuthDialog` (see its doc comment): the footer button is
 * a `<form>` submit so Enter works with two blocking fields, and a synchronous `inFlightRef`
 * guards a double fire.
 *
 * Looks like the admin `ConfirmDialog` (`FormConfirmDialog`); callers pick the confirm variant and
 * icon tone, `danger-light` with the red warning by default.
 */
const ConfirmDowngradeDialog = ({
  open,
  requiresPassword = true,
  requiresCode,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant,
  iconTone,
}: ConfirmDowngradeDialogProps) => {
  const { formatMessage } = useIntl();
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);
  const inFlightRef = React.useRef(false);

  const canSubmit =
    !requiresPassword || (password.length > 0 && (!requiresCode || code.trim().length >= 6));

  const reset = () => {
    setPassword('');
    setCode('');
    setError(undefined);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (inFlightRef.current || !canSubmit) {
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    setError(undefined);

    try {
      let credentials: DowngradeCredentials | undefined;
      if (requiresPassword) {
        credentials = requiresCode ? { password, code: code.trim() } : { password };
      }
      const message = await onConfirm(credentials);
      if (message) {
        setError(message);
        setCode('');
        return;
      }
      reset();
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormConfirmDialog
      open={open}
      onClose={close}
      title={
        title ??
        formatMessage({
          id: 'Settings.security.mfa.downgrade.title',
          defaultMessage: 'Lower two-factor requirements?',
        })
      }
      confirmLabel={
        confirmLabel ??
        formatMessage({
          id: 'Settings.security.mfa.downgrade.confirm',
          defaultMessage: 'Lower requirements',
        })
      }
      variant={variant}
      iconTone={iconTone}
      canSubmit={canSubmit}
      loading={submitting}
      onSubmit={handleSubmit}
      fields={
        requiresPassword ? (
          <CredentialFields
            password={password}
            onPasswordChange={setPassword}
            code={code}
            onCodeChange={setCode}
            requiresCode={requiresCode}
            error={error}
            codeHint={formatMessage({
              id: 'Settings.security.mfa.downgrade.code.hint',
              defaultMessage: 'A code from your authenticator app, or an unused recovery code.',
            })}
          />
        ) : null
      }
    >
      {/* Without fields there is no slot to hold a refusal, so it reads above the text. */}
      {requiresPassword ? null : <ErrorMessage error={error} />}
      {description}
      {requiresPassword ? (
        <Typography>
          {requiresCode
            ? formatMessage({
                id: 'Settings.security.confirm.passwordAndCode',
                defaultMessage: 'Confirm your password and a code to continue.',
              })
            : formatMessage({
                id: 'Settings.security.confirm.password',
                defaultMessage: 'Confirm your password to continue.',
              })}
        </Typography>
      ) : null}
    </FormConfirmDialog>
  );
};

export { ConfirmDowngradeDialog };
export type { ConfirmDowngradeDialogProps, DowngradeCredentials };
