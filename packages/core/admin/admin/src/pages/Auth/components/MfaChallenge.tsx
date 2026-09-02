import * as React from 'react';

import { Box, Button, Flex, Main, Typography, Link } from '@strapi/design-system';
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
import { translatedErrors } from '../../../utils/translatedErrors';
import { getRedirectTo } from '../utils';

/**
 * What `Login` hands over when `/login` answers with a challenge instead of a session, via
 * router state. `createBrowserRouter` persists this in `window.history.state.usr` for the life
 * of the history entry it's attached to, and restores it on a full page reload — so the state
 * itself is not where the "refresh returns to login" guarantee comes from. `MfaChallenge` reads
 * it once on mount and immediately replaces that history entry with `state: null` (see the
 * effect below); that's what actually keeps a refresh, a direct visit, or a back/forward
 * navigation from resurrecting the challenge token.
 */
export interface MfaChallengeLocationState {
  challengeToken: string;
  expiresIn: number;
  rememberMe: boolean;
}

const isChallengeState = (value: unknown): value is MfaChallengeLocationState =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as MfaChallengeLocationState).challengeToken === 'string' &&
  typeof (value as MfaChallengeLocationState).expiresIn === 'number' &&
  typeof (value as MfaChallengeLocationState).rememberMe === 'boolean';

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
  const { loginMfa } = useAuth('MfaChallenge', (auth) => auth);

  // Captured once, on mount, from whatever `location.state` was at that moment. The effect below
  // clears `location.state` right after, so every later render (including the one that clearing
  // navigate itself triggers) must keep working from this in-memory copy rather than reading
  // `location.state` again — otherwise the guard below would see the state disappear and bounce
  // the user back to login immediately after it successfully validated the challenge.
  const [challenge] = React.useState<MfaChallengeLocationState | null>(() =>
    isChallengeState(location.state) ? location.state : null
  );

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
    setApiError(undefined);

    const res = await loginMfa({
      challengeToken: challenge.challengeToken,
      code,
      rememberMe: challenge.rememberMe,
    });

    if ('error' in res) {
      setApiError(res.error.message ?? 'Something went wrong');
      return;
    }

    navigate(getRedirectTo(location.search));
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
              <Button fullWidth type="submit">
                {formatMessage({ id: 'Auth.form.mfa.button.verify', defaultMessage: 'Verify' })}
              </Button>
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
