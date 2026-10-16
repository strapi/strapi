import * as React from 'react';

import { Button, Flex, Modal, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { type Passkey } from '../../../../shared/contracts/mfa';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useNotification } from '../../features/Notifications';
import { useToMessage } from '../../hooks/useToMessage';
import { useDeletePasskeyMutation } from '../../services/mfa';

import { CredentialFields } from './CredentialFields';

interface RemovePasskeyDialogProps {
  /** The passkey being removed, or `undefined` when the dialog is closed. */
  passkey?: Passkey;
  onClose: () => void;
}

/**
 * Removing a passkey costs the password and a live code, exactly as adding one does.
 *
 * It is not a lockout risk -- the authenticator app always survives it -- but it is destructive
 * and irreversible for the credential named, and a session alone must not be enough to take away
 * a factor the holder may be relying on when their phone is elsewhere. The server enforces this;
 * this dialog is how the credentials get collected.
 */
const RemovePasskeyDialog = ({ passkey, onClose }: RemovePasskeyDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();

  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();

  // Re-entrancy guard, as `AddPasskeyDialog` has: the submit is awaited and the button is a
  // destructive one, so a double click must not send two deletes.
  const inFlightRef = React.useRef(false);
  const [submitting, setSubmitting] = React.useState(false);

  const [deletePasskey, { reset: resetDelete }] = useDeletePasskeyMutation();

  const canSubmit = password.length > 0 && code.trim().length >= 6;

  const close = () => {
    setPassword('');
    setCode('');
    setError(undefined);
    resetDelete();
    onClose();
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (inFlightRef.current || !canSubmit || !passkey) {
      return;
    }
    inFlightRef.current = true;
    setSubmitting(true);
    setError(undefined);

    try {
      const res = await deletePasskey({ id: passkey.id, password, code: code.trim() });
      if ('error' in res) {
        setError(toMessage(res.error));
        return;
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Settings.profile.form.section.mfa.passkeys.delete.success',
          defaultMessage: 'Passkey removed',
        }),
      });
      close();
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal.Root
      open={passkey !== undefined}
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
              id: 'Settings.profile.form.section.mfa.passkeys.delete.title',
              defaultMessage: 'Remove this passkey?',
            })}
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <ErrorMessage error={error} />
              <Typography>
                {formatMessage(
                  {
                    id: 'Settings.profile.form.section.mfa.passkeys.delete.intro',
                    defaultMessage:
                      '{name} will no longer sign you in. Your authenticator app is unaffected. Confirm your password and a code from it, or an unused recovery code.',
                  },
                  { name: passkey?.name ?? '' }
                )}
              </Typography>
              <CredentialFields
                password={password}
                onPasswordChange={setPassword}
                code={code}
                onCodeChange={setCode}
              />
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onClick={close} type="button">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button variant="danger-light" type="submit" loading={submitting} disabled={!canSubmit}>
              {formatMessage({
                id: 'Settings.profile.form.section.mfa.passkeys.delete.confirm',
                defaultMessage: 'Remove',
              })}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export { RemovePasskeyDialog };
