import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Field,
  Flex,
  Modal,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { QRCodeSVG } from 'qrcode.react';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ErrorMessage } from '../../components/ErrorMessage';
import { useToMessage } from '../../hooks/useToMessage';
import {
  useAcknowledgeRecoveryCodesMutation,
  useEnrolMfaMutation,
  useVerifyMfaEnrolmentMutation,
} from '../../services/mfa';

import { CredentialFields } from './CredentialFields';
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
 * store-globally: any other component triggering the same mutation with the same key shares --
 * and can clobber -- this dialog's cached result. Nothing else uses these strings, and nothing
 * else should.
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
 * Three steps: current password (re-authentication), scan the QR and confirm with a code, then
 * save the recovery codes.
 *
 * The secret, the otpauth URI and the codes also land in the Redux store, because RTK Query keeps
 * a mutation's `data` for as long as the triggering hook stays mounted -- and this dialog is
 * mounted for the whole profile-page session, not just while `open`. Each mutation therefore
 * carries a `fixedCacheKey` (`MFA_ENROL_CACHE_KEYS`) so `reset()` can delete its entry
 * synchronously on close. That cuts both ways: RTK Query deliberately skips its own unmount
 * cleanup for a keyed mutation, so a page unmount that never runs `close()` (browser Back while
 * the dialog sits open) would strand the secret in the store -- which is what the effect below
 * the mutation hooks exists for.
 *
 * `handlePassword` guards re-entrancy with a synchronous `inFlightRef`, for the reason
 * `ReAuthDialog.tsx` sets out in full: a real click on a submit button fires both the React
 * handler and the browser's native submit before either awaits or React re-renders.
 *
 * The footer buttons call their handler from `onClick` rather than relying on `type="submit"`,
 * because the shared Jest setup polyfills `window.PointerEvent` with a class that does not extend
 * `MouseEvent` (jsdom has none natively), so native form submission never fires under
 * `user.click()` in this suite. The exception is `replace` mode's password step, whose two
 * blocking fields need a real submit button for Enter to work at all -- so Continue carries
 * `type="submit"` there, and only there. That is also why only `handlePassword` needs the ref:
 * the scan step's Verify button takes the design system's default `type="button"`, so a click
 * reaches `onClick` alone and Enter reaches `onSubmit` alone -- never both in one tick.
 */
const EnrolDialog = ({ open, onClose, mode = 'enrol' }: EnrolDialogProps) => {
  const isReplace = mode === 'replace';
  const { formatMessage } = useIntl();
  const toMessage = useToMessage();
  const [step, setStep] = React.useState<Step>({ name: 'password' });
  /**
   * Set when the user tries to dismiss the dialog while the recovery codes are on screen. The
   * codes are shown exactly once and are the only way back into a locked-out account, so Escape,
   * an overlay click or the X must not silently destroy them -- but neither should the dialog
   * trap the user with no explanation. It refuses the dismissal and says why; the checkbox in
   * `RecoveryCodes` is the way out.
   */
  const [dismissBlocked, setDismissBlocked] = React.useState(false);
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
        if (isOpen) {
          return;
        }
        if (step.name === 'codes') {
          setDismissBlocked(true);
          return;
        }
        close();
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
                <CredentialFields
                  password={password}
                  onPasswordChange={setPassword}
                  code={code}
                  onCodeChange={setCode}
                  requiresCode={isReplace}
                />
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
              {dismissBlocked ? (
                <Alert
                  variant="warning"
                  closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
                  onClose={() => setDismissBlocked(false)}
                  title={formatMessage({
                    id: 'Settings.profile.form.section.mfa.codes.dismiss.title',
                    defaultMessage: 'Save your recovery codes first',
                  })}
                >
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.codes.dismiss.body',
                    defaultMessage:
                      'These codes are shown once and are the only way back in if you lose your authenticator. Copy or download them, then tick the box below.',
                  })}
                </Alert>
              ) : null}
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
