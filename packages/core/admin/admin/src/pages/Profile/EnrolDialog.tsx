import * as React from 'react';

import { Box, Button, Field, Flex, Modal, TextInput, Typography } from '@strapi/design-system';
import { QRCodeSVG } from 'qrcode.react';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useAPIErrorHandler } from '../../hooks/useAPIErrorHandler';
import {
  useAcknowledgeRecoveryCodesMutation,
  useEnrolMfaMutation,
  useVerifyMfaEnrolmentMutation,
} from '../../services/mfa';
import { BaseQueryError, isBaseQueryError } from '../../utils/baseQuery';

import { RecoveryCodes } from './RecoveryCodes';

import type { SerializedError } from '@reduxjs/toolkit';

interface EnrolDialogProps {
  open: boolean;
  onClose: () => void;
}

const ManualKey = styled(Typography)`
  font-family: monospace;
`;

type Step =
  | { name: 'password' }
  | { name: 'scan'; secret: string; otpauthUri: string }
  | { name: 'codes'; recoveryCodes: string[] };

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

/**
 * Three steps: current password (re-authentication), scan the QR code and confirm with a code,
 * then save the recovery codes. Everything sensitive lives in `step` and is dropped when the
 * dialog closes; closing early on the scan step leaves the account un-enrolled (the server only
 * flips enrolment on verify), and closing on the codes step leaves it enrolled but
 * unacknowledged, which the profile section then warns about.
 *
 * Each step that submits (password, scan) wraps its own `Modal.Body` *and* `Modal.Footer` in one
 * `<form>` so a real browser still submits on Enter in the text field. The footer button itself
 * is `type="button"` with its own `onClick` calling the same handler, rather than `type="submit"`
 * relying on the form's native submit-activation: this project's shared Jest setup
 * (`packages/admin-test-utils/src/setup.ts`) polyfills `window.PointerEvent` with a class that
 * does not extend `MouseEvent` (jsdom has no native `PointerEvent`, see jsdom/jsdom#2666 and
 * radix-ui/primitives#1822), and `@testing-library/user-event` dispatches `click` as a
 * `PointerEvent` -- so jsdom's activation-behaviour check (`MouseEvent.isImpl`) never matches and
 * a submit button's native form-submission silently never fires under `user.click()` anywhere in
 * this suite (confirmed with a minimal repro outside this component). `onClick` sidesteps that
 * entirely and still can't double-submit: a `type="button"` never triggers native submission on
 * its own.
 */
const EnrolDialog = ({ open, onClose }: EnrolDialogProps) => {
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [step, setStep] = React.useState<Step>({ name: 'password' });
  const [password, setPassword] = React.useState('');
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();

  const [enrol, { isLoading: isEnrolling }] = useEnrolMfaMutation();
  const [verify, { isLoading: isVerifying }] = useVerifyMfaEnrolmentMutation();
  const [acknowledge] = useAcknowledgeRecoveryCodesMutation();

  const reset = () => {
    setStep({ name: 'password' });
    setPassword('');
    setCode('');
    setError(undefined);
  };

  const close = () => {
    reset();
    onClose();
  };

  const toMessage = (err: BaseQueryError | SerializedError) =>
    isBaseQueryError(err)
      ? formatAPIError(err)
      : formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' });

  const handlePassword = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(undefined);
    const res = await enrol({ password });
    if ('error' in res) {
      setError(toMessage(res.error));
      return;
    }
    setPassword('');
    setStep({ name: 'scan', secret: res.data.secret, otpauthUri: res.data.otpauthUri });
  };

  const handleVerify = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setError(undefined);
    const res = await verify({ code });
    if ('error' in res) {
      setError(toMessage(res.error));
      return;
    }
    setCode('');
    setStep({ name: 'codes', recoveryCodes: res.data.recoveryCodes });
  };

  const handleAcknowledged = async () => {
    await acknowledge({});
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
            {formatMessage({
              id: 'Settings.profile.form.section.mfa.enrol.title',
              defaultMessage: 'Enable two-factor authentication',
            })}
          </Modal.Title>
        </Modal.Header>

        {step.name === 'password' ? (
          <form onSubmit={handlePassword}>
            <Modal.Body>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <ErrorMessage error={error} />
                <Typography>
                  {formatMessage({
                    id: 'Settings.profile.form.section.mfa.enrol.password.intro',
                    defaultMessage: 'Confirm your current password to start.',
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                  />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="tertiary" onClick={close}>
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button
                type="button"
                onClick={() => handlePassword()}
                loading={isEnrolling}
                disabled={password.length === 0}
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
                    <QRCodeSVG
                      value={step.otpauthUri}
                      size={180}
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
                type="button"
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
            <RecoveryCodes codes={step.recoveryCodes} onAcknowledged={handleAcknowledged} />
          </Modal.Body>
        ) : null}
      </Modal.Content>
    </Modal.Root>
  );
};

export { EnrolDialog };
export type { EnrolDialogProps };
