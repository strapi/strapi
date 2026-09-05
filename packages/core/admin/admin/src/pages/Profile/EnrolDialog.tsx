import * as React from 'react';

import { Box, Button, Field, Flex, Modal, TextInput, Typography } from '@strapi/design-system';
import { QRCodeSVG } from 'qrcode.react';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  useAcknowledgeRecoveryCodesMutation,
  useEnrolMfaMutation,
  useVerifyMfaEnrolmentMutation,
} from '../../services/mfa';

import { ErrorMessage, useToMessage } from './DialogUtils';
import { RecoveryCodes } from './RecoveryCodes';

interface EnrolDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * `enrol` (default): first enrolment, password only on step 1. `replace`: the account is
   * already enrolled and is swapping authenticator apps; step 1 also needs a current code (TOTP
   * or an unused recovery code) because `POST /mfa/enrol` demands it while enrolled. The active
   * secret keeps working until step 2 verifies the new one; the recovery codes are reissued.
   */
  mode?: 'enrol' | 'replace';
}

const ManualKey = styled(Typography)`
  font-family: monospace;
`;

/**
 * `fixedCacheKey`s for the three mutations below. These key `state.adminApi.mutations`
 * store-globally -- RTK Query shares one cached result across every component that triggers a
 * mutation with the same `fixedCacheKey`, regardless of which component instance called it. There
 * is only one consumer of these three mutations today (this dialog); if a future one reuses these
 * exact strings, it will silently share (and can clobber) this dialog's cached results.
 */
const MFA_ENROL_CACHE_KEYS = {
  password: 'mfa-enrol-password',
  verify: 'mfa-enrol-verify',
  acknowledge: 'mfa-enrol-acknowledge',
} as const;

type Step =
  | { name: 'password' }
  | { name: 'scan'; secret: string; otpauthUri: string }
  | { name: 'codes'; recoveryCodes: string[] };

/**
 * Three steps: current password (re-authentication), scan the QR code and confirm with a code,
 * then save the recovery codes.
 *
 * State lives in two places, and both are cleared on every close path (Cancel, Escape, overlay
 * click, or a successful acknowledge) *and* on unmount:
 * - `step`/`password`/`code`/`error` are local React state, cleared by `reset()`.
 * - `{ secret, otpauthUri }` and `{ recoveryCodes }` also land in the Redux store, because RTK
 *   Query keeps every mutation's `data` in `state.adminApi.mutations` for as long as the
 *   triggering hook stays mounted -- and this dialog (`<EnrolDialog>` in `TwoFactorSection.tsx`)
 *   is mounted for the whole profile-page session, not just while `open`. Each of the three
 *   mutations below is given a `fixedCacheKey` (see `MFA_ENROL_CACHE_KEYS`) specifically so
 *   `reset()` can synchronously delete its entry (`removeMutationResult`) the moment the dialog
 *   closes; without a `fixedCacheKey`, RTK Query only drops a mutation result on unmount or once a
 *   *newer* call supersedes it, and even then only after the default un-subscribe delay -- so the
 *   secret/URI/codes would otherwise sit in the store indefinitely.
 *
 *   `fixedCacheKey` cuts both ways, though: RTK Query's own unmount cleanup explicitly *skips*
 *   resetting a mutation that has one (it's meant to survive a remount), so if the whole page
 *   unmounts this dialog without `close()` ever running -- browser Back, or an app redirect, while
 *   it's sitting open on the scan or codes step -- the secret/URI/codes would otherwise survive in
 *   the store for the rest of the SPA session. The effect right after the mutation hooks below
 *   covers exactly that path; calling the three resets again on an already-`close()`d dialog is a
 *   harmless no-op (deleting an already-absent store entry does nothing).
 *
 * `handlePassword`/`handleVerify` are called from both the `<form onSubmit>` (a real browser
 * submitting on Enter in the text field) and the footer button's `onClick` (see below), so each
 * guards itself against re-entrancy (`isEnrolling`/`isVerifying`, plus the same length checks the
 * buttons use for `disabled`) -- otherwise pressing Enter twice while a request is in flight posts
 * twice, and a too-short code (or an empty password) typed then submitted via Enter would reach
 * the rate-limited endpoints despite the button refusing it.
 *
 * The footer buttons themselves don't need `type="submit"`: this project's shared Jest setup
 * (`packages/admin-test-utils/src/setup.ts`) polyfills `window.PointerEvent` with a class that
 * does not extend `MouseEvent` (jsdom has no native `PointerEvent`, see jsdom/jsdom#2666 and
 * radix-ui/primitives#1822), and `@testing-library/user-event` dispatches `click` as a
 * `PointerEvent` -- so jsdom's activation-behaviour check (`MouseEvent.isImpl`) never matches and
 * a submit button's native form-submission silently never fires under `user.click()` anywhere in
 * this suite. `onClick` calling the same handler sidesteps that; the design system's `Button`
 * already defaults its own `type` to `"button"` (confirmed by reading its source), so there's
 * nothing to opt out of and no risk of it also firing a native submit.
 *
 * That "one blocking field per step" premise holds for a fresh enrolment (password alone, then a
 * code alone) but not for `replace` mode's password step: `POST /mfa/enrol` demands a current
 * code too while already enrolled (re-proving the factor being replaced), so that step has *two*
 * blocking fields in the same `<form>`. Per the HTML spec's implicit-submission algorithm
 * (4.10.22.2), a form with more than one field that blocks implicit submission needs an actual
 * submit button for Enter to do anything at all -- so the Continue button carries
 * `type="submit"` in replace mode only (see the JSX below), and `onClick` still calls the same
 * handler directly for the jsdom reason above. That `type="submit"` reintroduces the re-entrancy
 * hazard `ReAuthDialog.tsx`'s doc comment covers in full: a *real* click on a submit button both
 * fires the React `onClick` handler and triggers the browser's native default action of
 * submitting the form, both synchronously, before either handler's `await` resolves or React
 * re-renders with `isEnrolling` reflecting the first call -- so `handlePassword` guards with a
 * synchronous `inFlightRef` (`React.useRef`, flipped in the same tick the first call starts)
 * rather than relying on `isEnrolling` alone, exactly like `ReAuthDialog`'s `handleSubmit`.
 */
const EnrolDialog = ({ open, onClose, mode = 'enrol' }: EnrolDialogProps) => {
  const isReplace = mode === 'replace';
  const { formatMessage } = useIntl();
  const toMessage = useToMessage();
  const [step, setStep] = React.useState<Step>({ name: 'password' });
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  // Synchronous re-entrancy guard for `handlePassword` in replace mode -- see the class doc
  // comment above for why this can't be the mutation hook's `isLoading` state.
  const inFlightRef = React.useRef(false);

  const [enrol, { isLoading: isEnrolling, reset: resetEnrol }] = useEnrolMfaMutation({
    fixedCacheKey: MFA_ENROL_CACHE_KEYS.password,
  });
  const [verify, { isLoading: isVerifying, reset: resetVerify }] = useVerifyMfaEnrolmentMutation({
    fixedCacheKey: MFA_ENROL_CACHE_KEYS.verify,
  });
  const [acknowledge, { reset: resetAck }] = useAcknowledgeRecoveryCodesMutation({
    fixedCacheKey: MFA_ENROL_CACHE_KEYS.acknowledge,
  });

  // Unmount-only safety net: a `fixedCacheKey` mutation is deliberately *not*
  // cleared by RTK Query's own unmount cleanup (it's meant to survive a remount), so if this
  // component unmounts without `close()` having run first, nothing else would ever clear these
  // three cache entries. `removeMutationResult` keys on `fixedCacheKey`, not `requestId` (see the
  // mutations above), so the closures captured on mount delete the right store entries regardless
  // of which render produced them -- the effect intentionally never needs to re-run.
  React.useEffect(() => {
    return () => {
      resetEnrol();
      resetVerify();
      resetAck();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only, see the comment above
  }, []);

  const reset = () => {
    setStep({ name: 'password' });
    setPassword('');
    setCode('');
    setError(undefined);
    resetEnrol();
    resetVerify();
    resetAck();
  };

  const close = () => {
    reset();
    onClose();
  };

  const canContinue = password.length > 0 && (!isReplace || code.trim().length >= 6);

  const handlePassword = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (inFlightRef.current || isEnrolling || !canContinue) {
      return;
    }
    inFlightRef.current = true;
    setError(undefined);
    try {
      // A fresh enrolment sends the password alone; the server discards `code` on that path
      // anyway, but the contract documents `code` as replacement-only, so don't send it.
      const res = await enrol(isReplace ? { password, code: code.trim() } : { password });
      if ('error' in res) {
        setError(toMessage(res.error));
        return;
      }
      setPassword('');
      setCode('');
      setStep({ name: 'scan', secret: res.data.secret, otpauthUri: res.data.otpauthUri });
    } finally {
      inFlightRef.current = false;
    }
  };

  const handleVerify = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (isVerifying || code.trim().length < 6) {
      return;
    }
    setError(undefined);
    const res = await verify({ code: code.trim() });
    if ('error' in res) {
      setError(toMessage(res.error));
      return;
    }
    setCode('');
    setStep({ name: 'codes', recoveryCodes: res.data.recoveryCodes });
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
            {formatMessage(
              isReplace
                ? {
                    id: 'Settings.profile.form.section.mfa.replace.title',
                    defaultMessage: 'Replace authenticator',
                  }
                : {
                    id: 'Settings.profile.form.section.mfa.enrol.title',
                    defaultMessage: 'Enable two-factor authentication',
                  }
            )}
          </Modal.Title>
        </Modal.Header>

        {step.name === 'password' ? (
          <form onSubmit={handlePassword}>
            <Modal.Body>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <ErrorMessage error={error} />
                <Typography>
                  {formatMessage(
                    isReplace
                      ? {
                          id: 'Settings.profile.form.section.mfa.replace.intro',
                          defaultMessage:
                            'Confirm your password and a code from your current authenticator app, or an unused recovery code. Your current app keeps working until you verify the new one; your recovery codes will be replaced.',
                        }
                      : {
                          id: 'Settings.profile.form.section.mfa.enrol.password.intro',
                          defaultMessage: 'Confirm your current password to start.',
                        }
                  )}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                  />
                </Field.Root>
                {isReplace ? (
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
                ) : null}
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="tertiary" onClick={close}>
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button
                type={isReplace ? 'submit' : 'button'}
                onClick={() => handlePassword()}
                loading={isEnrolling}
                disabled={!canContinue}
              >
                {formatMessage({
                  id: 'Settings.profile.form.section.mfa.enrol.continue',
                  defaultMessage: 'Continue',
                })}
              </Button>
            </Modal.Footer>
          </form>
        ) : null}

        {step.name === 'scan' ? (
          <form onSubmit={handleVerify}>
            <Modal.Body>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <ErrorMessage error={error} />
                <Typography>
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.enrol.scan.intro',
                    defaultMessage:
                      'Scan this QR code with your authenticator app, or enter the key manually, then enter the code the app shows.',
                  })}
                </Typography>
                <Flex justifyContent="center">
                  <Box background="neutral0" padding={3} hasRadius>
                    {/*
                     * `marginSize` draws the QR spec's required 4-module quiet zone inside the
                     * SVG itself, on its own white `bgColor` -- so the code stays scannable
                     * regardless of the admin theme (dark mode would otherwise put dark modules
                     * flush against this `Box`'s dark `background`, which real authenticator
                     * apps commonly fail to read). `level="M"` gives it a bit of error-correction
                     * headroom, the usual choice for a screen-displayed TOTP code. Realistic
                     * account labels (an issuer plus a work email) push the encoded otpauth URI
                     * to QR version 8-9 at that error-correction level, so `size={260}` is what
                     * keeps each module above the ~4px practical scan floor once the quiet zone
                     * is included.
                     */}
                    <QRCodeSVG
                      value={step.otpauthUri}
                      size={260}
                      marginSize={4}
                      level="M"
                      role="img"
                      aria-label={formatMessage({
                        id: 'Settings.profile.form.section.mfa.enrol.scan.qr',
                        defaultMessage: 'Scan this QR code with your authenticator app',
                      })}
                    />
                  </Box>
                </Flex>
                <Flex direction="column" alignItems="stretch" gap={1}>
                  <Typography variant="pi" textColor="neutral600">
                    {formatMessage({
                      id: 'Settings.profile.form.section.mfa.enrol.scan.manual',
                      defaultMessage: 'Manual key',
                    })}
                  </Typography>
                  <ManualKey data-testid="mfa-manual-key">{step.secret}</ManualKey>
                </Flex>
                <Field.Root name="code" required>
                  <Field.Label>
                    {formatMessage({
                      id: 'Auth.form.mfa.code.label',
                      defaultMessage: 'Authentication code',
                    })}
                  </Field.Label>
                  <TextInput
                    autoComplete="one-time-code"
                    inputMode="numeric"
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
                onClick={() => handleVerify()}
                loading={isVerifying}
                disabled={code.trim().length < 6}
              >
                {formatMessage({ id: 'Auth.form.mfa.button.verify', defaultMessage: 'Verify' })}
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

export { EnrolDialog };
export type { EnrolDialogProps };
