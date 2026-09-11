import * as React from 'react';

import { startRegistration, type RegistrationResponseJSON } from '@simplewebauthn/browser';
import { Button, Field, Flex, Modal, TextInput, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../components/ErrorMessage';
import { useNotification } from '../../features/Notifications';
import { useToMessage } from '../../hooks/useToMessage';
import {
  usePasskeyRegistrationOptionsMutation,
  useRegisterPasskeyMutation,
} from '../../services/mfa';
import { ceremonyErrorKind } from '../../utils/webauthn';

import { CredentialFields } from './CredentialFields';

interface AddPasskeyDialogProps {
  open: boolean;
  onClose: () => void;
}

/** The server refuses a name outside 1..50 characters after trimming; match it here. */
const NAME_MAX = 50;

/**
 * Registers one passkey, in three steps that must stay in this order.
 *
 * 1. `POST /mfa/passkeys/options` with the current password and a live code -- the same gate
 *    `/mfa/disable` uses, because the credential this authorises satisfies every future challenge
 *    on its own: an attacker with a stolen session plus the password would otherwise register
 *    their own authenticator and keep access indefinitely, with the victim's app still working.
 * 2. `startRegistration` in the browser. `excludeCredentials` makes re-registering the *same*
 *    authenticator fail here with `InvalidStateError`, which is why that case has its own message.
 * 3. `POST /mfa/passkeys` with the name and response. No password or code: step 1 already
 *    authorised this ceremony, and it is single-use.
 *
 * No `fixedCacheKey`, unlike the sibling dialogs -- the password and code live in component state
 * that dies with the component. The mutations are still reset on close, because the options
 * response is not inert in the store: it holds a live, unspent registration challenge (300s TTL)
 * and the user's existing credential ids, and this dialog is mounted for the life of the Profile
 * page, so that entry would otherwise outlive every close.
 *
 * Submission mechanics follow `ReAuthDialog` (see its doc comment).
 */
const AddPasskeyDialog = ({ open, onClose }: AddPasskeyDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  // The ceremony itself is not an RTK mutation, so `isLoading` on either hook is false while the
  // browser prompt is up; this covers the whole three-step flow.
  const [submitting, setSubmitting] = React.useState(false);
  const inFlightRef = React.useRef(false);

  const [requestOptions, { reset: resetOptions }] = usePasskeyRegistrationOptionsMutation();
  const [registerPasskey, { reset: resetRegister }] = useRegisterPasskeyMutation();

  const trimmedName = name.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    trimmedName.length <= NAME_MAX &&
    password.length > 0 &&
    code.trim().length >= 6;

  const reset = () => {
    setName('');
    setPassword('');
    setCode('');
    setError(undefined);
    resetOptions();
    resetRegister();
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
      const optionsRes = await requestOptions({ password, code: code.trim() });
      if ('error' in optionsRes) {
        setError(toMessage(optionsRes.error));
        return;
      }

      let registration: RegistrationResponseJSON;
      try {
        registration = await startRegistration({ optionsJSON: optionsRes.data });
      } catch (ceremonyError) {
        const kind = ceremonyErrorKind(ceremonyError);
        // A dismissed or timed-out prompt is a no-op with the button re-enabled: the user closed
        // their own dialog and knows it. The other two kinds each say something actionable.
        if (kind === 'already-registered') {
          setError(
            formatMessage({
              id: 'Settings.profile.form.section.mfa.passkeys.add.alreadyRegistered',
              defaultMessage: 'That device already has a passkey for this account.',
            })
          );
        } else if (kind !== 'dismissed') {
          setError(
            formatMessage({
              id: 'Settings.profile.form.section.mfa.passkeys.add.failed',
              defaultMessage: 'Your device could not create a passkey. Try again.',
            })
          );
        }
        return;
      }

      const res = await registerPasskey({ name: trimmedName, registration });
      if ('error' in res) {
        setError(toMessage(res.error));
        return;
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Settings.profile.form.section.mfa.passkeys.add.success',
          defaultMessage: 'Passkey added',
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
              id: 'Settings.profile.form.section.mfa.passkeys.add.title',
              defaultMessage: 'Add a passkey',
            })}
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <ErrorMessage error={error} />
              <Typography>
                {formatMessage({
                  id: 'Settings.profile.form.section.mfa.passkeys.add.intro',
                  defaultMessage:
                    'Confirm your password and a code from your authenticator app or an unused recovery code, then name the passkey. Your device will ask you to approve it.',
                })}
              </Typography>
              <Field.Root
                name="passkeyName"
                required
                hint={formatMessage({
                  id: 'Settings.profile.form.section.mfa.passkeys.add.name.hint',
                  defaultMessage: 'Something you will recognise, like "MacBook Touch ID".',
                })}
              >
                <Field.Label>
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.passkeys.add.name.label',
                    defaultMessage: 'Passkey name',
                  })}
                </Field.Label>
                <TextInput
                  maxLength={NAME_MAX}
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                />
                <Field.Hint />
              </Field.Root>
              <CredentialFields
                password={password}
                onPasswordChange={setPassword}
                code={code}
                onCodeChange={setCode}
              />
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="tertiary" onClick={close}>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              type="submit"
              onClick={() => handleSubmit()}
              loading={submitting}
              disabled={!canSubmit}
            >
              {formatMessage({
                id: 'Settings.profile.form.section.mfa.passkeys.add.submit',
                defaultMessage: 'Add passkey',
              })}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

export { AddPasskeyDialog };
export type { AddPasskeyDialogProps };
