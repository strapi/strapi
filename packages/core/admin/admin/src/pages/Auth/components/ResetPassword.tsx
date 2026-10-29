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
import { usePasswordPolicy } from '../../../hooks/usePasswordPolicy';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../layouts/UnauthenticatedLayout';
import { login } from '../../../reducer';
import { useResetPasswordMutation } from '../../../services/auth';
import { isBaseQueryError } from '../../../utils/baseQuery';
import { translatedErrors } from '../../../utils/translatedErrors';

import type { PasswordSchema } from '../../../utils/passwordPolicy';

const getResetPasswordSchema = (passwordSchema: PasswordSchema) =>
  yup.object().shape({
    password: passwordSchema
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
  const { schema: passwordSchema, hint: passwordHint } = usePasswordPolicy();

  const validationSchema = React.useMemo(
    () => getResetPasswordSchema(passwordSchema),
    [passwordSchema]
  );

  const [resetPassword, { error }] = useResetPasswordMutation();

  const handleSubmit = async (body: ResetPassword.Request['body']) => {
    const res = await resetPassword(body);

    if ('data' in res) {
      dispatch(login({ token: res.data.token }));
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
            {error ? (
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
            validationSchema={validationSchema}
          >
            <Flex direction="column" alignItems="stretch" gap={6}>
              {[
                {
                  hint: passwordHint,
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
