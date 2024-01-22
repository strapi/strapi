import * as React from 'react';

import { Box, Button, Checkbox, Flex, Main, TextInput, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { Form, translatedErrors, useQuery } from '@strapi/helper-plugin';
import { Eye, EyeStriked } from '@strapi/icons';
import { Formik } from 'formik';
import camelCase from 'lodash/camelCase';
import { useIntl } from 'react-intl';
import { NavLink, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import { Logo } from '../../../components/UnauthenticatedLogo';
import { useAuth } from '../../../features/Auth';
import {
  UnauthenticatedLayout,
  Column,
  LayoutContent,
} from '../../../layouts/UnauthenticatedLayout';

import { FieldActionWrapper } from './FieldActionWrapper';

import type { Login } from '../../../../../shared/contracts/authentication';

interface LoginProps {
  children?: React.ReactNode;
}

const LOGIN_SCHEMA = yup.object().shape({
  email: yup.string().email(translatedErrors.email).required(translatedErrors.required),
  password: yup.string().required(translatedErrors.required),
  rememberMe: yup.bool().nullable(),
});

const Login = ({ children }: LoginProps) => {
  const [apiError, setApiError] = React.useState<string>();
  const [passwordShown, setPasswordShown] = React.useState(false);
  const { formatMessage } = useIntl();
  const query = useQuery();
  const { push } = useHistory();

  const login = useAuth('Login', (state) => state.login);

  const handleLogin = async (body: Parameters<typeof login>[0]) => {
    setApiError(undefined);

    const res = await login(body);

    if ('error' in res) {
      const message = res.error.message ?? 'Something went wrong';

      if (camelCase(message).toLowerCase() === 'usernotactive') {
        push('/auth/oops');
        return;
      }

      setApiError(message);
    } else {
      const redirectTo = query.get('redirectTo');
      const redirectUrl = redirectTo ? decodeURIComponent(redirectTo) : '/';

      push(redirectUrl);
    }
  };

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={1}>
              <Typography variant="alpha" as="h1">
                {formatMessage({
                  id: 'Auth.form.welcome.title',
                  defaultMessage: 'Welcome!',
                })}
              </Typography>
            </Box>
            <Box paddingBottom={7}>
              <Typography variant="epsilon" textColor="neutral600">
                {formatMessage({
                  id: 'Auth.form.welcome.subtitle',
                  defaultMessage: 'Log in to your Strapi account',
                })}
              </Typography>
            </Box>
            {apiError ? (
              <Typography id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
                {apiError}
              </Typography>
            ) : null}
          </Column>
          <Formik
            enableReinitialize
            initialValues={{
              email: '',
              password: '',
              rememberMe: false,
            }}
            onSubmit={(values) => {
              handleLogin(values);
            }}
            validationSchema={LOGIN_SCHEMA}
            validateOnChange={false}
          >
            {({ values, errors, handleChange }) => (
              <Form>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  <TextInput
                    error={
                      errors.email
                        ? formatMessage({
                            id: errors.email,
                            defaultMessage: 'This value is required.',
                          })
                        : ''
                    }
                    value={values.email}
                    onChange={handleChange}
                    label={formatMessage({ id: 'Auth.form.email.label', defaultMessage: 'Email' })}
                    placeholder={formatMessage({
                      id: 'Auth.form.email.placeholder',
                      defaultMessage: 'kai@doe.com',
                    })}
                    name="email"
                    required
                  />
                  <PasswordInput
                    error={
                      errors.password
                        ? formatMessage({
                            id: errors.password,
                            defaultMessage: 'This value is required.',
                          })
                        : ''
                    }
                    onChange={handleChange}
                    value={values.password}
                    label={formatMessage({
                      id: 'global.password',
                      defaultMessage: 'Password',
                    })}
                    name="password"
                    type={passwordShown ? 'text' : 'password'}
                    endAction={
                      <FieldActionWrapper
                        onClick={(e) => {
                          e.stopPropagation();
                          setPasswordShown((prev) => !prev);
                        }}
                        label={formatMessage(
                          passwordShown
                            ? {
                                id: 'Auth.form.password.show-password',
                                defaultMessage: 'Show password',
                              }
                            : {
                                id: 'Auth.form.password.hide-password',
                                defaultMessage: 'Hide password',
                              }
                        )}
                      >
                        {passwordShown ? <Eye /> : <EyeStriked />}
                      </FieldActionWrapper>
                    }
                    required
                  />
                  <Checkbox
                    onValueChange={(checked) => {
                      handleChange({ target: { value: checked, name: 'rememberMe' } });
                    }}
                    value={values.rememberMe}
                    aria-label="rememberMe"
                    name="rememberMe"
                  >
                    {formatMessage({
                      id: 'Auth.form.rememberMe.label',
                      defaultMessage: 'Remember me',
                    })}
                  </Checkbox>
                  <Button fullWidth type="submit">
                    {formatMessage({ id: 'Auth.form.button.login', defaultMessage: 'Login' })}
                  </Button>
                </Flex>
              </Form>
            )}
          </Formik>
          {children}
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            {/* @ts-expect-error – error with inferring the props from the as component */}
            <Link as={NavLink} to="/auth/forgot-password">
              {formatMessage({
                id: 'Auth.link.forgot-password',
                defaultMessage: 'Forgot your password?',
              })}
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

export { Login };
export type { LoginProps };
