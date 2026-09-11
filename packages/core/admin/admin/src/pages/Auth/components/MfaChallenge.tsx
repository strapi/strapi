import * as React from 'react';

import {
  browserSupportsWebAuthn,
  startAuthentication,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/browser';
import { Box, Button, Checkbox, Flex, Main, Typography, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';

import { Form } from '../../../components/Form';
import { InputRenderer } from '../../../components/FormInputs/Renderer';
import { Logo } from '../../../components/UnauthenticatedLogo';
import { useAuth } from '../../../features/Auth';
import { useToMessage } from '../../../hooks/useToMessage';
import {
  UnauthenticatedLayout,
  Column,
  LayoutContent,
} from '../../../layouts/UnauthenticatedLayout';
import { useLoginMfaWebauthnOptionsMutation } from '../../../services/auth';
import { translatedErrors } from '../../../utils/translatedErrors';
import { ceremonyErrorKind } from '../../../utils/webauthn';
import { getRedirectTo } from '../utils';

/** `createBrowserRouter` persists router state in `window.history.state.usr` and restores it on a
 * full reload, so the history-clearing effect below is what makes a refresh return to login. */
export interface MfaChallengeLocationState {
  challengeToken: string;
  expiresIn: number;
  rememberMe: boolean;
  /** Optional only because an older bundle's state may be in flight; read as null. */
  trustedDeviceDays?: number | null;
  /** Optional for the same reason; read as false, and the code field always works. */
  passkeyAvailable?: boolean;
}

const isChallengeState = (value: unknown): value is MfaChallengeLocationState =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as MfaChallengeLocationState).challengeToken === 'string' &&
  typeof (value as MfaChallengeLocationState).expiresIn === 'number' &&
  typeof (value as MfaChallengeLocationState).rememberMe === 'boolean' &&
  (typeof (value as MfaChallengeLocationState).trustedDeviceDays === 'number' ||
    (value as MfaChallengeLocationState).trustedDeviceDays === null ||
    (value as MfaChallengeLocationState).trustedDeviceDays === undefined) &&
  (typeof (value as MfaChallengeLocationState).passkeyAvailable === 'boolean' ||
    (value as MfaChallengeLocationState).passkeyAvailable === undefined);

// The server's bounds. Which factor it is gets decided server-side.
const MFA_SCHEMA = yup.object().shape({
  code: yup
    .string()
    .required(translatedErrors.required)
    // These descriptors interpolate a `{min}`/`{max}`, so passing one bare makes `formatMessage`
    // throw and crash the form.
    .min(6, { ...translatedErrors.minLength, values: { min: 6 } })
    .max(32, { ...translatedErrors.maxLength, values: { max: 32 } }),
});

const MfaChallenge = () => {
  const toMessage = useToMessage();
  const [apiError, setApiError] = React.useState<string>();
  const { formatMessage } = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const { loginMfa, loginMfaWebauthn } = useAuth('MfaChallenge', (auth) => auth);
  const [webauthnOptions] = useLoginMfaWebauthnOptionsMutation();

  // Captured once on mount, because the effect below clears `location.state` right after: reading
  // it again would bounce the user to login immediately after the challenge validated.
  const [challenge] = React.useState<MfaChallengeLocationState | null>(() =>
    isChallengeState(location.state) ? location.state : null
  );

  const trustedDeviceDays = challenge?.trustedDeviceDays ?? null;

  /**
   * `trustDevice` lives here rather than in the `<Form>`'s own values because the passkey path is
   * a button click, not a form submit, and so never sees them. Leaving the flag in form state
   * silently drops "Trust this device" for every passkey login.
   */
  const [trustDevice, setTrustDevice] = React.useState(false);
  const [passkeyBusy, setPasskeyBusy] = React.useState(false);
  /**
   * Lifted the same way `trustDevice` was, so both submit paths can read the other's busy
   * flag. Without it, `Verify` and `Use a passkey` could both be in flight at
   * once, racing the same single-use challenge -- whichever loses shows the same generic refusal
   * as a genuine failure, and the verify route charges an attempt against the challenge's budget
   * even for a self-inflicted race.
   */
  const [codeBusy, setCodeBusy] = React.useState(false);
  /**
   * The synchronous re-entrancy guard both submit paths share, for the reason `ReAuthDialog`
   * gives: a fast double Enter fires `onSubmit` twice before React re-renders with the busy
   * state set, so a state-based check is stale for the second call. The `codeBusy`/`passkeyBusy`
   * state above still drives the buttons' `loading`/`disabled`; this decides whether the work
   * actually runs.
   *
   * It matters more here than in a dialog: the challenge is single use, and the verify route
   * charges an attempt against its budget before evaluating anything. A self-inflicted race
   * therefore costs the user one of their attempts and shows the loser's generic refusal over a
   * login that in fact succeeded.
   */
  const inFlightRef = React.useRef(false);

  const hasClearedHistoryStateRef = React.useRef(false);

  React.useEffect(() => {
    if (!challenge || hasClearedHistoryStateRef.current) {
      return;
    }
    hasClearedHistoryStateRef.current = true;

    // Without this, `window.history.state.usr` still carries the challenge token after a refresh, a
    // revisit from history, or a back/forward navigation.
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null }
    );
  }, [challenge, location.pathname, location.search, navigate]);

  if (!challenge) {
    return <Navigate to={{ pathname: '/auth/login', search: location.search }} replace />;
  }

  const handleSubmit = async ({ code }: { code: string }) => {
    // Enter can submit before React re-renders the disabled attribute, and two concurrent calls race
    // the same single-use challenge: the loser shows a refusal over a login that succeeded, and the
    // verify route charges an attempt for a race the user did not cause.
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setApiError(undefined);
    setCodeBusy(true);

    try {
      const res = await loginMfa({
        challengeToken: challenge.challengeToken,
        code,
        rememberMe: challenge.rememberMe,
        trustDevice: trustedDeviceDays !== null && trustDevice,
      });

      if ('error' in res) {
        setApiError(toMessage(res.error));
        return;
      }

      navigate(getRedirectTo(location.search));
    } finally {
      inFlightRef.current = false;
      setCodeBusy(false);
    }
  };

  /** Called per render rather than hoisted: module scope would freeze the answer for the life of
   * the bundle, and defeat the per-test mock. */
  const showPasskey = challenge.passkeyAvailable === true && browserSupportsWebAuthn();

  /** Three steps that must stay in this order: options (which stores the ceremony's challenge on
   * the challenge row), the browser ceremony, then the assertion. */
  const handlePasskey = async () => {
    // The same ref `handleSubmit` uses: the two paths spend one challenge between them.
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setApiError(undefined);
    setPasskeyBusy(true);

    try {
      const optionsRes = await webauthnOptions({ challengeToken: challenge.challengeToken });
      if ('error' in optionsRes) {
        setApiError(toMessage(optionsRes.error));
        return;
      }

      let assertion: AuthenticationResponseJSON;
      try {
        assertion = await startAuthentication({ optionsJSON: optionsRes.data });
      } catch (error) {
        // A dismissed prompt is a no-op: the user closed their own dialog. Everything else gets one
        // neutral line, because the cause is not safe to paraphrase.
        if (ceremonyErrorKind(error) !== 'dismissed') {
          setApiError(
            formatMessage({
              id: 'Auth.form.mfa.passkey.failed',
              defaultMessage:
                'Your device could not complete the passkey check. Try again, or enter a code instead.',
            })
          );
        }
        return;
      }

      const res = await loginMfaWebauthn({
        challengeToken: challenge.challengeToken,
        assertion,
        rememberMe: challenge.rememberMe,
        trustDevice: trustedDeviceDays !== null && trustDevice,
      });

      if ('error' in res) {
        setApiError(toMessage(res.error));
        return;
      }

      navigate(getRedirectTo(location.search));
    } finally {
      inFlightRef.current = false;
      setPasskeyBusy(false);
    }
  };

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={1}>
              <Typography variant="alpha" tag="h1" textAlign="center">
                {formatMessage({
                  id: 'Auth.form.mfa.title',
                  defaultMessage: 'Two-factor authentication',
                })}
              </Typography>
            </Box>
            <Box paddingBottom={7}>
              <Typography
                variant="epsilon"
                textColor="neutral600"
                textAlign="center"
                display="block"
              >
                {formatMessage({
                  id: 'Auth.form.mfa.subtitle',
                  defaultMessage:
                    'Enter the code from your authenticator app, or one of your recovery codes.',
                })}
              </Typography>
            </Box>
            {apiError ? (
              <Typography id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
                {apiError}
              </Typography>
            ) : null}
          </Column>
          <Form
            method="POST"
            initialValues={{ code: '' }}
            onSubmit={handleSubmit}
            validationSchema={MFA_SCHEMA}
          >
            <Flex direction="column" alignItems="stretch" gap={6}>
              <InputRenderer
                label={formatMessage({
                  id: 'Auth.form.mfa.code.label',
                  defaultMessage: 'Authentication code',
                })}
                name="code"
                required
                type="string"
                autoComplete="one-time-code"
                maxLength={32}
              />
              {trustedDeviceDays !== null ? (
                <Checkbox
                  name="trustDevice"
                  checked={trustDevice}
                  onCheckedChange={(checked) => setTrustDevice(checked === true)}
                >
                  {formatMessage(
                    {
                      id: 'Auth.form.mfa.trustDevice.label',
                      defaultMessage:
                        'Trust this device for {days, plural, one {# day} other {# days}}',
                    },
                    { days: trustedDeviceDays }
                  )}
                </Checkbox>
              ) : null}
              <Button fullWidth type="submit" loading={codeBusy} disabled={passkeyBusy}>
                {formatMessage({ id: 'Auth.form.mfa.button.verify', defaultMessage: 'Verify' })}
              </Button>
              {showPasskey ? (
                <Button
                  fullWidth
                  type="button"
                  variant="tertiary"
                  onClick={handlePasskey}
                  loading={passkeyBusy}
                  disabled={codeBusy}
                >
                  {formatMessage({
                    id: 'Auth.form.mfa.passkey.button',
                    defaultMessage: 'Use a passkey',
                  })}
                </Button>
              ) : null}
            </Flex>
          </Form>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <Link isExternal={false} tag={NavLink} to="/auth/login">
              {formatMessage({ id: 'Auth.form.mfa.link.back', defaultMessage: 'Back to login' })}
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

export { MfaChallenge };
