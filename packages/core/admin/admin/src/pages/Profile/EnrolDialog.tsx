import * as React from 'react';

import { Box, Button, Field, Flex, Modal, TextInput, Typography } from '@strapi/design-system';
import { QRCodeSVG } from 'qrcode.react';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { MFA_ERROR_CODES } from '../../../../shared/utils/mfa-error-codes';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useNotification } from '../../features/Notifications';
import { useMfaErrorMessage } from '../../hooks/useMfaErrorMessage';
import {
  useAcknowledgeRecoveryCodesMutation,
  useEnrolMfaMutation,
  useVerifyMfaEnrolmentMutation,
} from '../../services/mfa';

import { CredentialFields } from './CredentialFields';
import { RecoveryCodes, RecoveryCodesDismissAlert } from './RecoveryCodes';

interface EnrolDialogProps {
  open: boolean;
  onClose: () => void;
  /** `replace` also needs a current code on step 1, because `POST /mfa/enrol` demands one while
   * enrolled. The active secret keeps working until step 2 verifies the new one. */
  mode?: 'enrol' | 'replace';
}

const ManualKey = styled(Typography)`
  font-family: monospace;
`;

/** `JBSWY3DPEHPK3PXP` as `JBSW Y3DP EHPK 3PXP`. */
const groupKey = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

/** These key `state.adminApi.mutations` store-globally, so any other component using the same
 * string shares -- and can clobber -- this dialog's cached result. */
/** The scan step checks a code from the new authenticator, so the login challenge's hint to use
 * a recovery code instead would send the user down a path that cannot work here. */
const SETUP_CODE_MESSAGES = {
  [MFA_ERROR_CODES.INVALID_CODE]: {
    id: 'Settings.profile.form.section.mfa.enrol.error.invalidCode',
    defaultMessage:
      'That code was not accepted. Codes change every 30 seconds. Wait for the next one and try again.',
  },
};

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
 * Three steps: current password, scan the QR and confirm with a code, then save the recovery codes.
 *
 * The secret and codes sit in the RTK Query store while the dialog is mounted, so each mutation
 * has a `fixedCacheKey` (`MFA_ENROL_CACHE_KEYS`) that `reset()` clears on close, and an unmount
 * effect clears them when the page goes away with the dialog open. `handlePassword` guards
 * re-entrancy as `ReAuthDialog` does.
 */
const EnrolDialog = ({ open, onClose, mode = 'enrol' }: EnrolDialogProps) => {
  const isReplace = mode === 'replace';
  const { formatMessage } = useIntl();
  const toMessage = useMfaErrorMessage();
  const [step, setStep] = React.useState<Step>({ name: 'password' });
  /** The codes are shown exactly once and are the only way back into a locked-out account, so a
   * dismissal must not silently destroy them. Refused with an explanation instead. */
  const [dismissBlocked, setDismissBlocked] = React.useState(false);
  // The checkbox is the user's assertion that they saved the codes; the acknowledge request is
  // bookkeeping. Once ticked, a failed request must cost them a profile warning, not their way out.
  const [codesSaved, setCodesSaved] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  // Synchronous re-entrancy guard for `handlePassword` in replace mode
  const inFlightRef = React.useRef(false);
  const scanCodeRef = React.useRef<HTMLInputElement>(null);
  const scanIntroRef = React.useRef<HTMLParagraphElement>(null);
  const manualKeyLabelId = React.useId();
  const { toggleNotification } = useNotification();

  // A new step replaces the whole body, so focus would otherwise fall back to the dialog. Moving it
  // to the scan step's instructions announces them and puts a keyboard user at the top of the
  // step; the codes step does the same for its heading (`RecoveryCodes`).
  React.useEffect(() => {
    if (step.name === 'scan') {
      scanIntroRef.current?.focus();
    }
  }, [step.name]);

  const handleCopyKey = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'Settings.profile.form.section.mfa.enrol.scan.copied',
          defaultMessage: 'Key copied.',
        }),
      });
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  const [enrol, { isLoading: isEnrolling, reset: resetEnrol }] = useEnrolMfaMutation({
    fixedCacheKey: MFA_ENROL_CACHE_KEYS.password,
  });
  const [verify, { isLoading: isVerifying, reset: resetVerify }] = useVerifyMfaEnrolmentMutation({
    fixedCacheKey: MFA_ENROL_CACHE_KEYS.verify,
  });
  const [acknowledge, { reset: resetAck }] = useAcknowledgeRecoveryCodesMutation({
    fixedCacheKey: MFA_ENROL_CACHE_KEYS.acknowledge,
  });

  // RTK Query deliberately does not clear a `fixedCacheKey` mutation on unmount, so without this
  // an unmount that skipped `close()` would strand all three entries. `removeMutationResult` keys
  // on the cache key, not `requestId`, so the mount-time closures are correct and it never re-runs.
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
    // The one instance serves enrol and replace for the whole page visit, so a warning earned in
    // one run must not be on screen before the next run's codes appear.
    setDismissBlocked(false);
    setCodesSaved(false);
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
      // In the code field's error slot, with focus back on it: the fix is a fresh code.
      setError(toMessage(res.error, SETUP_CODE_MESSAGES));
      scanCodeRef.current?.focus();
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
        if (step.name === 'codes' && !codesSaved) {
          setDismissBlocked(true);
          return;
        }
        close();
      }}
    >
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {/* The last step gets its own title: the codes are the one thing on this dialog the user
                cannot get back, and a title that never changes gives no sign the step has moved. */}
            {formatMessage(
              step.name === 'codes'
                ? {
                    id: 'Settings.profile.form.section.mfa.codes.title',
                    defaultMessage: 'Save your recovery codes',
                  }
                : isReplace
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
                  error={error}
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
                <Typography ref={scanIntroRef} tabIndex={-1}>
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.enrol.scan.intro',
                    defaultMessage:
                      'Scan this QR code with your authenticator app, or enter the key manually, then enter the code the app shows.',
                  })}
                </Typography>
                <Flex justifyContent="center">
                  <Box background="neutral0" padding={3} hasRadius>
                    {/*
                     * `marginSize` puts the spec's 4-module quiet zone inside the SVG on its own
                     * white `bgColor`, so dark mode cannot leave dark modules flush against the
                     * panel background -- which real authenticator apps commonly fail to read. A
                     * realistic account label pushes the URI to QR version 8-9 at `level="M"`, so
                     * `size={260}` is what keeps each module above the practical scan floor.
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
                  <Typography variant="pi" textColor="neutral600" id={manualKeyLabelId}>
                    {formatMessage({
                      id: 'Settings.profile.form.section.mfa.enrol.scan.manual',
                      defaultMessage: 'Manual key',
                    })}
                  </Typography>
                  <Flex gap={2} alignItems="center" wrap="wrap">
                    {/* Shown in groups of four so it can be read and typed without losing one's
                        place; authenticator apps ignore the spaces. Copy takes the bare key. */}
                    <ManualKey data-testid="mfa-manual-key" aria-labelledby={manualKeyLabelId}>
                      {groupKey(step.secret)}
                    </ManualKey>
                    <Button
                      variant="tertiary"
                      size="S"
                      type="button"
                      onClick={() => handleCopyKey(step.secret)}
                    >
                      {formatMessage({
                        id: 'Settings.profile.form.section.mfa.enrol.scan.copy',
                        defaultMessage: 'Copy key',
                      })}
                    </Button>
                  </Flex>
                </Flex>
                <Field.Root name="code" required error={error}>
                  <Field.Label>
                    {formatMessage({
                      id: 'Auth.form.mfa.code.label',
                      defaultMessage: 'Authentication code',
                    })}
                  </Field.Label>
                  <TextInput
                    ref={scanCodeRef}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={32}
                    value={code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                  />
                  <Field.Error />
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
                <RecoveryCodesDismissAlert onClose={() => setDismissBlocked(false)} />
              ) : null}
              <RecoveryCodes
                codes={step.recoveryCodes}
                onAcknowledged={handleAcknowledged}
                onSavedChange={setCodesSaved}
              />
            </Flex>
          </Modal.Body>
        ) : null}
      </Modal.Content>
    </Modal.Root>
  );
};

export { EnrolDialog };
export type { EnrolDialogProps };
