import * as React from 'react';

import { Button, Field, Flex, Modal, TextInput, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useNotification } from '../../features/Notifications';
import { useAPIErrorHandler } from '../../hooks/useAPIErrorHandler';
import {
  useAcknowledgeRecoveryCodesMutation,
  useDisableMfaMutation,
  useRegenerateRecoveryCodesMutation,
} from '../../services/mfa';
import { BaseQueryError, isBaseQueryError } from '../../utils/baseQuery';

import { RecoveryCodes } from './RecoveryCodes';

import type { SerializedError } from '@reduxjs/toolkit';

interface ReAuthDialogProps {
  open: boolean;
  onClose: () => void;
  intent: 'regenerate' | 'disable';
}

/**
 * `fixedCacheKey`s for the three mutations below. Same rationale as `MFA_ENROL_CACHE_KEYS` in
 * `EnrolDialog.tsx`: these key `state.adminApi.mutations` store-globally, so a future consumer
 * that reuses one of these exact strings would silently share (and could clobber) this dialog's
 * cached results. Must not collide with `MFA_ENROL_CACHE_KEYS`.
 */
const MFA_REAUTH_CACHE_KEYS = {
  regenerate: 'mfa-reauth-regenerate',
  disable: 'mfa-reauth-disable',
  acknowledge: 'mfa-reauth-acknowledge',
} as const;

type Step = { name: 'form' } | { name: 'codes'; recoveryCodes: string[] };

const ErrorMessage = ({ error }: { error?: string }) => {
  if (!error) {
    return null;
  }

  return (
    <Typography role="alert" textColor="danger600">
      {error}
    </Typography>
  );
};

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
 * One form, two intents: re-authenticate with the current password plus a second factor (a TOTP
 * code or an unused recovery code), then either regenerate the recovery-code set or disable MFA
 * entirely. Modeled on `EnrolDialog` -- same `Modal` skeleton, same `ErrorMessage`/`toMessage`,
 * same reset-on-close and unmount-safety-net pattern; see that file for the full rationale, only
 * summarised here.
 *
 * `regenerate` and `disable` share this dialog because they share the same re-authentication gate
 * (`RegenerateRecoveryCodes`/`Disable` in `shared/contracts/mfa.ts` both take `{ password, code
 * }`); only the copy, the mutation invoked, and the submit button's danger styling vary by
 * `intent`.
 *
 * State lives in two places, both cleared on every close path (Cancel, Escape, overlay click, a
 * successful disable, or a successful acknowledge) *and* on unmount:
 * - `step`/`password`/`code`/`error` are local React state, cleared by `reset()`.
 * - The freshly issued recovery-code set (on the `regenerate` path) also lands in the Redux store,
 *   because RTK Query keeps a mutation's `data` in `state.adminApi.mutations` for as long as the
 *   triggering hook stays mounted -- and this dialog is mounted for the whole profile-page
 *   session (see `TwoFactorSection.tsx`), not just while `open`. Each of the three mutations below
 *   is given a `fixedCacheKey` (`MFA_REAUTH_CACHE_KEYS`) specifically so `reset()` can
 *   synchronously delete its entry (`removeMutationResult`) the moment the dialog closes.
 *
 *   `fixedCacheKey` cuts both ways: RTK Query's own unmount cleanup explicitly *skips* resetting
 *   a mutation that has one (it's meant to survive a remount), so if the whole page unmounts this
 *   dialog without `close()` ever running -- browser Back, or an app redirect, while it's sitting
 *   open on the codes step -- the recovery codes would otherwise survive in the store for the
 *   rest of the SPA session. The effect right after the mutation hooks below covers exactly that
 *   path; calling the three resets again on an already-`close()`d dialog is a harmless no-op.
 *
 * `handleSubmit` is called from both the `<form onSubmit>` (a real browser submitting on Enter in
 * either field) and the footer button's `onClick`, so it guards itself against re-entrancy
 * (`isSubmitting`, plus the same length checks the button uses for `disabled`) -- otherwise
 * pressing Enter twice while a request is in flight posts twice.
 *
 * The footer button doesn't need `type="submit"`: see `EnrolDialog.tsx`'s comment on this
 * project's `PointerEvent` polyfill -- `onClick` calling the same handler sidesteps it, and the
 * design system's `Button` already defaults its own `type` to `"button"`.
 */
const ReAuthDialog = ({ open, onClose, intent }: ReAuthDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [step, setStep] = React.useState<Step>({ name: 'form' });
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();

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

  const toMessage = (err: BaseQueryError | SerializedError) =>
    isBaseQueryError(err)
      ? formatAPIError(err)
      : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' });

  const isSubmitting = intent === 'regenerate' ? isRegenerating : isDisabling;

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isSubmitting || password.length === 0 || code.trim().length < 6) {
      return;
    }
    setError(undefined);

    if (intent === 'regenerate') {
      const res = await regenerateRecoveryCodes({ password, code });
      if ('error' in res) {
        setError(toMessage(res.error));
        return;
      }
      setPassword('');
      setCode('');
      setStep({ name: 'codes', recoveryCodes: res.data.recoveryCodes });
      return;
    }

    const res = await disableMfa({ password, code });
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
  };

  const handleAcknowledged = async () => {
    setError(undefined);
    const res = await acknowledge({});
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                  />
                </Field.Root>
                <Field.Root name="code" required>
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
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="tertiary" onClick={close}>
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button
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
