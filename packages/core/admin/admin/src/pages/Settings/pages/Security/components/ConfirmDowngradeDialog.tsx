import * as React from 'react';

import { Button, Field, Flex, Modal, TextInput, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../../../Profile/DialogUtils';

interface DowngradeCredentials {
  password: string;
  /** Present only when the caller is enrolled (a TOTP code or an unused recovery code). */
  code?: string;
}

interface ConfirmDowngradeDialogProps {
  open: boolean;
  /** `true` when the caller is enrolled: the server then requires a second-factor code too. */
  requiresCode: boolean;
  onClose: () => void;
  /**
   * Performs the save with the collected credentials. Resolves `undefined` on success (the
   * parent then closes the dialog) or a message to show, in which case the dialog stays open
   * with the password kept so only the code needs retyping.
   */
  onConfirm: (credentials: DowngradeCredentials) => Promise<string | undefined>;
}

/**
 * Re-authentication for a security downgrade on the Security settings page: lowering the mode,
 * dropping a required role while the resulting mode is not `required`, or lengthening the grace
 * period (`isSecurityDowngrade`). The server (`PUT /admin/security-settings`) refuses such a
 * change without the caller's password, plus a current code when the caller is enrolled.
 *
 * Deliberately not cycle 1's `ReAuthDialog`: that one is bound to the regenerate/disable
 * mutations and always requires a code, while an *unenrolled* administrator may lower protection
 * with the password alone. This component owns no mutation; the card hands it the save.
 *
 * Same submission mechanics as `ReAuthDialog` (see its doc comment): the footer button is
 * `type="submit"` so Enter works with two blocking fields, and a synchronous `inFlightRef`
 * guards the click + native-submit double fire.
 */
const ConfirmDowngradeDialog = ({
  open,
  requiresCode,
  onClose,
  onConfirm,
}: ConfirmDowngradeDialogProps) => {
  const { formatMessage } = useIntl();
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  const [submitting, setSubmitting] = React.useState(false);
  const inFlightRef = React.useRef(false);

  const canSubmit = password.length > 0 && (!requiresCode || code.trim().length >= 6);

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
      const message = await onConfirm(
        requiresCode ? { password, code: code.trim() } : { password }
      );
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
    <Modal.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
    >
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: 'Settings.security.mfa.downgrade.title',
              defaultMessage: 'Confirm lowering two-factor requirements',
            })}
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <ErrorMessage error={error} />
              <Typography>
                {formatMessage({
                  id: 'Settings.security.mfa.downgrade.intro',
                  defaultMessage:
                    'This change makes two-factor authentication less strict for other users. Confirm your password to continue.',
                })}
              </Typography>
              <Field.Root name="password" required>
                <Field.Label>
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.enrol.password.label',
                    defaultMessage: 'Current password',
                  })}
                </Field.Label>
                <TextInput
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
              </Field.Root>
              {requiresCode ? (
                <Field.Root
                  name="code"
                  required
                  hint={formatMessage({
                    id: 'Settings.security.mfa.downgrade.code.hint',
                    defaultMessage:
                      'A code from your authenticator app, or an unused recovery code.',
                  })}
                >
                  <Field.Label>
                    {formatMessage({
                      id: 'Auth.form.mfa.code.label',
                      defaultMessage: 'Authentication code',
                    })}
                  </Field.Label>
                  <TextInput
                    autoComplete="one-time-code"
                    maxLength={32}
                    value={code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                  />
                  <Field.Hint />
                </Field.Root>
              ) : null}
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="tertiary" onClick={close}>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              type="submit"
              variant="danger"
              onClick={() => handleSubmit()}
              loading={submitting}
              disabled={!canSubmit}
            >
              {formatMessage({ id: 'app.components.Button.confirm', defaultMessage: 'Confirm' })}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export { ConfirmDowngradeDialog };
export type { ConfirmDowngradeDialogProps, DowngradeCredentials };
