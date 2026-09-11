import * as React from 'react';

import { Button, Flex, Modal, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ErrorMessage } from '../../components/ErrorMessage';
import { useNotification } from '../../features/Notifications';
import { useToMessage } from '../../hooks/useToMessage';
import {
  useAcknowledgeRecoveryCodesMutation,
  useDisableMfaMutation,
  useRegenerateRecoveryCodesMutation,
} from '../../services/mfa';

import { CredentialFields } from './CredentialFields';
import { RecoveryCodes } from './RecoveryCodes';

interface ReAuthDialogProps {
  open: boolean;
  onClose: () => void;
  intent: 'regenerate' | 'disable';
}

/**
 * `fixedCacheKey`s for the three mutations below -- see `MFA_ENROL_CACHE_KEYS` in
 * `EnrolDialog.tsx` for the full rationale (store-global keys into `state.adminApi.mutations`).
 * Must not collide with `MFA_ENROL_CACHE_KEYS`.
 */
const MFA_REAUTH_CACHE_KEYS = {
  regenerate: 'mfa-reauth-regenerate',
  disable: 'mfa-reauth-disable',
  acknowledge: 'mfa-reauth-acknowledge',
} as const;

type Step = { name: 'form' } | { name: 'codes'; recoveryCodes: string[] };

const COPY = {
  regenerate: {
    title: {
      id: 'Settings.profile.form.section.mfa.regenerate.title',
      defaultMessage: 'Generate new recovery codes',
    },
    intro: {
      id: 'Settings.profile.form.section.mfa.regenerate.intro',
      defaultMessage:
        'Your current recovery codes stop working as soon as new ones are generated. Confirm your password and a code from your authenticator app or an unused recovery code.',
    },
    submit: {
      id: 'Settings.profile.form.section.mfa.regenerate.submit',
      defaultMessage: 'Generate new recovery codes',
    },
  },
  disable: {
    title: {
      id: 'Settings.profile.form.section.mfa.disable.title',
      defaultMessage: 'Disable two-factor authentication',
    },
    intro: {
      id: 'Settings.profile.form.section.mfa.disable.intro',
      defaultMessage:
        'Your account will only be protected by your password. Every other device signed in to this account will be logged out. Confirm your password and a code from your authenticator app or an unused recovery code.',
    },
    submit: {
      id: 'Settings.profile.form.section.mfa.disable.submit',
      defaultMessage: 'Disable two-factor authentication',
    },
  },
} as const;

/**
 * One form, two intents: re-authenticate with the current password plus a second factor, then
 * either regenerate the recovery-code set or disable MFA. They share this dialog because they
 * share the gate -- both take `{ password, code }` -- and only the copy, the mutation and the
 * submit button's styling vary by `intent`. Reset-on-close and the unmount safety net work
 * exactly as in `EnrolDialog`; see that file for why the `fixedCacheKey` is needed.
 *
 * This is the canonical note on the re-entrancy hazard the other MFA dialogs refer to.
 *
 * The form has two blocking fields, and per the HTML spec's implicit-submission algorithm a form
 * with more than one needs a real submit button for Enter to do anything -- so the footer button
 * carries `type="submit"`. That reintroduces a hazard a click-only button does not have: a real
 * click on a submit button fires the React `onClick` *and* the browser's native submit, so
 * `onSubmit` runs too, both synchronously, before either handler's `await` resolves and before
 * React re-renders with `isLoading` set. A guard that reads `isLoading` is therefore stale for
 * the second call. `handleSubmit` uses a synchronous `inFlightRef` flipped in the same tick the
 * first call starts, plus the same length checks the button uses for `disabled`.
 *
 * `onClick` also calls the handler directly because jsdom's `PointerEvent` polyfill means
 * `user.click()` never reaches a submit button's native default action in this suite.
 */
const ReAuthDialog = ({ open, onClose, intent }: ReAuthDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const toMessage = useToMessage();
  const [step, setStep] = React.useState<Step>({ name: 'form' });
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  // Synchronous re-entrancy guard for `handleSubmit` -- see the class doc comment above for why
  // this can't be the mutation hook's `isLoading` state.
  const inFlightRef = React.useRef(false);

  const [regenerateRecoveryCodes, { isLoading: isRegenerating, reset: resetRegenerate }] =
    useRegenerateRecoveryCodesMutation({
      fixedCacheKey: MFA_REAUTH_CACHE_KEYS.regenerate,
    });
  const [disableMfa, { isLoading: isDisabling, reset: resetDisable }] = useDisableMfaMutation({
    fixedCacheKey: MFA_REAUTH_CACHE_KEYS.disable,
  });
  const [acknowledge, { reset: resetAck }] = useAcknowledgeRecoveryCodesMutation({
    fixedCacheKey: MFA_REAUTH_CACHE_KEYS.acknowledge,
  });

  // Unmount-only safety net: a `fixedCacheKey` mutation is deliberately *not* cleared by RTK
  // Query's own unmount cleanup (it's meant to survive a remount), so if this component unmounts
  // without `close()` having run first, nothing else would ever clear these three cache entries.
  // `removeMutationResult` keys on `fixedCacheKey`, not `requestId`, so the closures captured on
  // mount delete the right store entries regardless of which render produced them -- the effect
  // intentionally never needs to re-run.
  React.useEffect(() => {
    return () => {
      resetRegenerate();
      resetDisable();
      resetAck();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only, see the comment above
  }, []);

  const reset = () => {
    setStep({ name: 'form' });
    setPassword('');
    setCode('');
    setError(undefined);
    resetRegenerate();
    resetDisable();
    resetAck();
  };

  const close = () => {
    reset();
    onClose();
  };

  const isSubmitting = intent === 'regenerate' ? isRegenerating : isDisabling;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (inFlightRef.current || password.length === 0 || code.trim().length < 6) {
      return;
    }
    inFlightRef.current = true;
    setError(undefined);

    try {
      // The server treats a code with surrounding whitespace as wrong rather than trimming it
      // itself (a pasted TOTP or recovery code commonly picks up a trailing space/newline).
      const trimmedCode = code.trim();

      if (intent === 'regenerate') {
        const res = await regenerateRecoveryCodes({ password, code: trimmedCode });
        if ('error' in res) {
          setError(toMessage(res.error));
          return;
        }
        setPassword('');
        setCode('');
        setStep({ name: 'codes', recoveryCodes: res.data.recoveryCodes });
        return;
      }

      const res = await disableMfa({ password, code: trimmedCode });
      if ('error' in res) {
        setError(toMessage(res.error));
        return;
      }
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Settings.profile.form.section.mfa.disable.success',
          defaultMessage: 'Two-factor authentication is disabled.',
        }),
      });
      close();
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleAcknowledged = async () => {
    setError(undefined);
    const res = await acknowledge();
    if ('error' in res) {
      setError(toMessage(res.error));
      return;
    }
    close();
  };

  const copy = COPY[intent];

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
          <Modal.Title>{formatMessage(copy.title)}</Modal.Title>
        </Modal.Header>

        {step.name === 'form' ? (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <ErrorMessage error={error} />
                <Typography>{formatMessage(copy.intro)}</Typography>
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
                variant={intent === 'disable' ? 'danger' : undefined}
                onClick={() => handleSubmit()}
                loading={isSubmitting}
                disabled={password.length === 0 || code.trim().length < 6}
              >
                {formatMessage(copy.submit)}
              </Button>
            </Modal.Footer>
          </form>
        ) : null}

        {step.name === 'codes' ? (
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <ErrorMessage error={error} />
              <RecoveryCodes codes={step.recoveryCodes} onAcknowledged={handleAcknowledged} />
            </Flex>
          </Modal.Body>
        ) : null}
      </Modal.Content>
    </Modal.Root>
  );
};

export { ReAuthDialog };
export type { ReAuthDialogProps };
