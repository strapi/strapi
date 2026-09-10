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
import {
  UnauthenticatedLayout,
  Column,
  LayoutContent,
} from '../../../layouts/UnauthenticatedLayout';
import { useLoginMfaWebauthnOptionsMutation } from '../../../services/auth';
import { translatedErrors } from '../../../utils/translatedErrors';
import { ceremonyErrorKind } from '../../../utils/webauthn';
import { getRedirectTo } from '../utils';

/**
 * What `Login` hands over when `/login` answers with a challenge instead of a session, via
 * router state. `createBrowserRouter` persists this in `window.history.state.usr` for the life
 * of the history entry it's attached to, and restores it on a full page reload — so the state
 * itself is not where the "refresh returns to login" guarantee comes from. `MfaChallenge` reads
 * it once on mount and immediately replaces that history entry with `state: null` (see the
 * effect below); that's what actually keeps a refresh, a direct visit, or a back/forward
 * navigation from resurrecting the challenge token. Passkeys adds a second factor to the same
 * challenge — `Use a passkey` runs a WebAuthn ceremony instead of asking for a code, and
 * `trustDevice` therefore lives in component state rather than the form's, because both paths
 * read it.
 */
export interface MfaChallengeLocationState {
  challengeToken: string;
  expiresIn: number;
  rememberMe: boolean;
  /**
   * Trusted devices: the trust period the organisation offers ("Trust this device for {n} days"), or
   * null when it offers none. Missing in a state written by an older bundle mid-flight, which is
   * read as null.
   */
  trustedDeviceDays?: number | null;
  /**
   * Passkeys: whether this account can satisfy the challenge with a passkey (the organisation
   * allows them and the account has at least one). Missing in a state written by an older bundle
   * mid-flight, which is read as false -- the code field always works.
   */
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

// Same bounds as the server's validator: a 6-8 digit TOTP code or a 10-character recovery code
// the user may have typed with dashes or spaces. Which factor it is gets decided server-side.
const MFA_SCHEMA = yup.object().shape({
  code: yup
    .string()
    .required(translatedErrors.required)
    // `translatedErrors.minLength`/`maxLength` interpolate a `{min}`/`{max}` placeholder, so
    // (matching the pattern in ResetPassword.tsx and Settings/pages/Users/utils/validation.ts)
    // they need an explicit `values` object — passing the descriptor bare makes react-intl's
    // `formatMessage` throw and crash the form.
    .min(6, { ...translatedErrors.minLength, values: { min: 6 } })
    .max(32, { ...translatedErrors.maxLength, values: { max: 32 } }),
});

const MfaChallenge = () => {
  const [apiError, setApiError] = React.useState<string>();
  const { formatMessage } = useIntl();
  const location = useLocation();
  const navigate = useNavigate();
  const { loginMfa, loginMfaWebauthn } = useAuth('MfaChallenge', (auth) => auth);
  const [webauthnOptions] = useLoginMfaWebauthnOptionsMutation();

  // Captured once, on mount, from whatever `location.state` was at that moment. The effect below
  // clears `location.state` right after, so every later render (including the one that clearing
  // navigate itself triggers) must keep working from this in-memory copy rather than reading
  // `location.state` again — otherwise the guard below would see the state disappear and bounce
  // the user back to login immediately after it successfully validated the challenge.
  const [challenge] = React.useState<MfaChallengeLocationState | null>(() =>
    isChallengeState(location.state) ? location.state : null
  );

  const trustedDeviceDays = challenge?.trustedDeviceDays ?? null;

  /**
   * Passkeys lifted `trustDevice` out of the `<Form>`'s Formik state (where trusted devices put it) into
   * the component's own state: the passkey path is a button click, not a form submit, so it never
   * sees Formik's values, and leaving the flag in form state would silently drop "Trust this
   * device" for every passkey login. Both submit paths now read this one value.
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

  const hasClearedHistoryStateRef = React.useRef(false);

  React.useEffect(() => {
    if (!challenge || hasClearedHistoryStateRef.current) {
      return;
    }
    hasClearedHistoryStateRef.current = true;

    // Replace this history entry with the same URL but `state: null`. Without this,
    // `window.history.state.usr` (which `createBrowserRouter` restores on a full page reload)
    // would still carry the challenge token after the user refreshes, opens this URL again from
    // history, or navigates back/forward to it.
    navigate(
      { pathname: location.pathname, search: location.search },
      { replace: true, state: null }
    );
  }, [challenge, location.pathname, location.search, navigate]);

  if (!challenge) {
    return <Navigate to={{ pathname: '/auth/login', search: location.search }} replace />;
  }

  const handleSubmit = async ({ code }: { code: string }) => {
    // Mirrors the guard at the top of `handlePasskey`: a disabled submit button already stops a
    // real click or Enter, this is the same defence-in-depth for whatever triggers `onSubmit`.
    if (passkeyBusy) {
      return;
    }
    setApiError(undefined);
    setCodeBusy(true);

    try {
      const res = await loginMfa({
        challengeToken: challenge.challengeToken,
        code,
        rememberMe: challenge.rememberMe,
        // Only meaningful when the organisation offers trust; the server ignores it otherwise.
        trustDevice: trustedDeviceDays !== null && trustDevice,
      });

      if ('error' in res) {
        setApiError(res.error.message ?? 'Something went wrong');
        return;
      }

      navigate(getRedirectTo(location.search));
    } finally {
      setCodeBusy(false);
    }
  };

  /**
   * `browserSupportsWebAuthn()` is called on every render rather than memoised: it is a cheap
   * feature test, and hoisting it to module scope would freeze the answer for the life of the
   * bundle (and defeat the per-test mock).
   */
  const showPasskey = challenge.passkeyAvailable === true && browserSupportsWebAuthn();

  /**
   * The passkey factor, as three steps that must stay in this order: exchange the challenge
   * token for options (the server stores that ceremony's challenge on the challenge row), run the
   * ceremony in the browser, then hand the assertion back for a session. `rememberMe` and
   * `trustDevice` ride along exactly as they do on the code path -- the server reads both out of
   * this body, and the trust grant is factor-agnostic.
   */
  const handlePasskey = async () => {
    // Mirrors the guard at the top of `handleSubmit`: a disabled button already stops a real
    // click, this is the same defence-in-depth for whatever else could call this.
    if (codeBusy) {
      return;
    }
    setApiError(undefined);
    setPasskeyBusy(true);

    try {
      const optionsRes = await webauthnOptions({ challengeToken: challenge.challengeToken });
      if ('error' in optionsRes) {
        setApiError(optionsRes.error.message ?? 'Something went wrong');
        return;
      }

      let assertion: AuthenticationResponseJSON;
      try {
        assertion = await startAuthentication({ optionsJSON: optionsRes.data });
      } catch (error) {
        // A dismissed or timed-out prompt is a no-op, not a failure: the user closed their own
        // dialog and is still looking at the code field. Everything else gets one neutral line --
        // the specific cause is the browser's business and is not safe to paraphrase.
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
        setApiError(res.error.message ?? 'Something went wrong');
        return;
      }

      navigate(getRedirectTo(location.search));
    } finally {
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
              <Button fullWidth type="submit" disabled={passkeyBusy}>
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
