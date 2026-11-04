import * as React from 'react';

import { Box, Button, Flex, Main, Typography, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import * as yup from 'yup';

import { ResetPassword } from '../../../../../shared/contracts/authentication';
import { Form } from '../../../components/Form';
import { InputRenderer } from '../../../components/FormInputs/Renderer';
import { Logo } from '../../../components/UnauthenticatedLogo';
import { useTypedDispatch } from '../../../core/store/hooks';
import { useAPIErrorHandler } from '../../../hooks/useAPIErrorHandler';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../layouts/UnauthenticatedLayout';
import { useResetPasswordMutation } from '../../../services/auth';
import { isBaseQueryError } from '../../../utils/baseQuery';
import { establishAdminSession } from '../../../utils/establishAdminSession';
import { getByteSize } from '../../../utils/strings';
import { translatedErrors } from '../../../utils/translatedErrors';

import { isMfaLockedError } from './Login';

import type { MfaChallengeLocationState } from './MfaChallenge';

const RESET_PASSWORD_SCHEMA = yup.object().shape({
  password: yup
    .string()
    .min(8, {
      id: translatedErrors.minLength.id,
      defaultMessage: 'Password must be at least 8 characters',
      values: { min: 8 },
    })
    // bcrypt has a max length of 72 bytes (not characters!)
    .test(
      'required-byte-size',
      {
        id: 'components.Input.error.contain.maxBytes',
        defaultMessage: 'Password must be less than 73 bytes',
      },
      function (value) {
        if (!value || typeof value !== 'string') return true; // validated elsewhere

        const byteSize = getByteSize(value);
        return byteSize <= 72;
      }
    )
    .test(
      'lowercase',
      {
        id: 'components.Input.error.contain.lowercase',
        defaultMessage: 'Password must contain at least 1 lowercase letter',
      },
      (value) => {
        if (!value) return true;
        return /[a-z]/.test(value);
      }
    )
    .test(
      'uppercase',
      {
        id: 'components.Input.error.contain.uppercase',
        defaultMessage: 'Password must contain at least 1 uppercase letter',
      },
      (value) => {
        if (!value) return true;
        return /[A-Z]/.test(value);
      }
    )
    .test(
      'number',
      {
        id: 'components.Input.error.contain.number',
        defaultMessage: 'Password must contain at least 1 number',
      },
      (value) => {
        if (!value) return true;
        return /\d/.test(value);
      }
    )
    .required({
      id: translatedErrors.required.id,
      defaultMessage: 'Password is required',
    })
    .nullable(),
  confirmPassword: yup
    .string()
    .required({
      id: translatedErrors.required.id,
      defaultMessage: 'Confirm password is required',
    })
    .oneOf([yup.ref('password'), null], {
      id: 'components.Input.error.password.noMatch',
      defaultMessage: 'Passwords must match',
    })
    .nullable(),
});

const ResetPassword = () => {
  const { formatMessage } = useIntl();
  const dispatch = useTypedDispatch();
  const navigate = useNavigate();
  const { search: searchString } = useLocation();
  const query = React.useMemo(() => new URLSearchParams(searchString), [searchString]);
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [resetPassword, { error }] = useResetPasswordMutation();
  /**
   * A locked account that is not enrolled has its new password committed before the lock is
   * checked, so the reset worked and the link is spent, yet no session follows. Saying only that
   * the account is locked would leave the user unsure whether the password changed.
   */
  const lockedAfterReset = Boolean(error && isBaseQueryError(error) && isMfaLockedError(error));

  const handleSubmit = async (body: ResetPassword.Request['body']) => {
    const res = await resetPassword(body);

    if ('data' in res) {
      if ('mfaRequired' in res.data) {
        // No session yet: hand the challenge to the second-factor screen through router state,
        // the same way `Login.tsx` does for an enrolled account.
        const state: MfaChallengeLocationState = {
          challengeToken: res.data.challengeToken,
          expiresIn: res.data.expiresIn,
          rememberMe: false,
          trustedDeviceDays: res.data.trustedDeviceDays ?? null,
          passkeyAvailable: res.data.passkeyAvailable === true,
        };
        navigate('/auth/mfa', { state });
        return;
      }

      establishAdminSession(dispatch, { token: res.data.token });
      navigate('/');
    }
  };
  /**
   * If someone doesn't have a reset password token
   * then they should just be redirected back to the login page.
   */
  if (!query.get('code')) {
    return <Navigate to="/auth/login" />;
  }

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={7}>
              <Typography tag="h1" variant="alpha">
                {formatMessage({
                  id: 'global.reset-password',
                  defaultMessage: 'Reset password',
                })}
              </Typography>
            </Box>
            {lockedAfterReset ? (
              <Typography id="global-form-error" role="alert" tabIndex={-1}>
                {formatMessage({
                  id: 'Auth.form.mfa.locked.afterReset',
                  defaultMessage:
                    'Your password was changed, but this account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.',
                })}
              </Typography>
            ) : error ? (
              <Typography id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
                {isBaseQueryError(error)
                  ? formatAPIError(error)
                  : formatMessage({
                      id: 'notification.error',
                      defaultMessage: 'An error occurred',
                    })}
              </Typography>
            ) : null}
          </Column>
          {lockedAfterReset ? null : (
            <Form
              method="POST"
              initialValues={{
                password: '',
                confirmPassword: '',
              }}
              onSubmit={(values) => {
                // We know query.code is defined because we check for it above.
                handleSubmit({ password: values.password, resetPasswordToken: query.get('code')! });
              }}
              validationSchema={RESET_PASSWORD_SCHEMA}
            >
              <Flex direction="column" alignItems="stretch" gap={6}>
                {[
                  {
                    hint: formatMessage({
                      id: 'Auth.form.password.hint',
                      defaultMessage:
                        'Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 number',
                    }),
                    label: formatMessage({
                      id: 'global.password',
                      defaultMessage: 'Password',
                    }),
                    name: 'password',
                    required: true,
                    type: 'password' as const,
                  },
                  {
                    label: formatMessage({
                      id: 'Auth.form.confirmPassword.label',
                      defaultMessage: 'Confirm Password',
                    }),
                    name: 'confirmPassword',
                    required: true,
                    type: 'password' as const,
                  },
                ].map((field) => (
                  <InputRenderer key={field.name} {...field} />
                ))}
                <Button fullWidth type="submit">
                  {formatMessage({
                    id: 'global.change-password',
                    defaultMessage: 'Change password',
                  })}
                </Button>
              </Flex>
            </Form>
          )}
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <Link tag={NavLink} to="/auth/login">
              {formatMessage({ id: 'Auth.link.ready', defaultMessage: 'Ready to sign in?' })}
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

export { ResetPassword };
