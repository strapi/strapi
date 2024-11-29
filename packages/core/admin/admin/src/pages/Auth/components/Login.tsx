import * as React from 'react';

import { Box, Button, Checkbox, Flex, Main, TextInput, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { Form, auth, translatedErrors, useFetchClient, useQuery } from '@strapi/helper-plugin';
import { Eye, EyeStriked } from '@strapi/icons';
import { Formik } from 'formik';
import camelCase from 'lodash/camelCase';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { NavLink, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import { Login } from '../../../../../shared/contracts/authentication';
import { useLocales } from '../../../components/LanguageProvider';
import { Logo } from '../../../components/UnauthenticatedLogo';
import {
  UnauthenticatedLayout,
  Column,
  LayoutContent,
} from '../../../layouts/UnauthenticatedLayout';

import { FieldActionWrapper } from './FieldActionWrapper';

import type { AxiosError } from 'axios';

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
  const { post } = useFetchClient();
  const { changeLocale } = useLocales();
  const query = useQuery();
  const { push } = useHistory();

  const mutation = useMutation(
    async (body: Login.Request['body'] & { rememberMe: boolean }) => {
      const {
        data: { data },
      } = await post<Login.Response>('/admin/login', body);

      return { ...data, rememberMe: body.rememberMe };
    },
    {
      onSuccess(data) {
        if (data) {
          const { token, user } = data;

          if (user.preferedLanguage) {
            changeLocale(user.preferedLanguage);
          }

          auth.setToken(token, data.rememberMe);
          auth.setUserInfo(user, data.rememberMe);

          const redirectTo = query.get('redirectTo');
          const redirectUrl = redirectTo ? decodeURIComponent(redirectTo) : '/';

          push(redirectUrl);
        }
      },
      onError(err: AxiosError<{ error: Login.Response['errors'] }>) {
        const message = err.response?.data?.error?.message ?? 'Something went wrong';

        if (camelCase(message).toLowerCase() === 'usernotactive') {
          push('/auth/oops');
          return;
        }

        setApiError(message);
      },
    }
  );

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
            {mutation.isError && apiError ? (
              <Typography id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
                {apiError}
              </Typography>
            ) : null}
          </Column>

          {/* TODO: Read feature flag and enable/disable login by email/password for superadmin user 
          
          <Formik
            enableReinitialize
            initialValues={{
              email: '',
              password: '',
              rememberMe: false,
            }}
            onSubmit={(values) => {
              mutation.mutate(values);
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
          </Formik> */}
          <div className="App" style={{ textAlign: '-webkit-center' as any }}>
            <GoogleButtonWrapper>
              <div
                className="google-btn"
                onClick={() => (window.location = `${window.strapi.backendURL}/sso/google` as any)}
              >
                <div className="google-icon-wrapper">
                  <div className="google-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24"
                      viewBox="0 0 24 24"
                      width="24"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                  </div>
                </div>
                <p className="btn-text">
                  <b>Sign in with google</b>
                </p>
              </div>
            </GoogleButtonWrapper>
            <AzureButtonWrapper>
              <div
                className="azure-btn"
                onClick={() => (window.location = `${window.strapi.backendURL}/sso/azuread` as any)}
              >
                <div className="icon-wrapper">
                  <div className="icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path fill="#F25022" d="M11.4 2H2v9.4h9.4V2Z" />
                      <path fill="#00A4EF" d="M11.4 12.6H2V22h9.4v-9.4Z" />
                      <path fill="#7FBA00" d="M22 2h-9.4v9.4H22V2Z" />
                      <path fill="#FFB900" d="M22 12.6h-9.4V22H22v-9.4Z" />
                    </svg>
                  </div>
                </div>
                <p className="btn-text">
                  <b>Sign in with Microsoft</b>
                </p>
              </div>
            </AzureButtonWrapper>
          </div>
          {children}
        </LayoutContent>
      </Main>
    </UnauthenticatedLayout>
  );
};

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

const GoogleButtonWrapper = styled.section`
  @import url(https://fonts.googleapis.com/css?family=Roboto:500);
  margin-bottom: 16px;
  
  .google-btn {
    width: 220px;
    height: 42px;
    background-color: #0078d4;
    border-radius: 2px;
    box-shadow: 0 3px 4px 0 rgba(0, 0, 0, .25);
    position: relative;
    display: flex;
    align-items: center;
  }
  .google-btn .google-icon-wrapper {
    position: absolute;
    left: 1px;
    width: 40px;
    height: 40px;
    border-radius: 2px;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .google-btn .google-icon {
    width: 18px;
    height: 18px;
  }
  .google-btn .btn-text {
    flex: 1;
    text-align: center;
    padding-left: 20px;
    color: #fff;
    font-size: 14px;
    letter-spacing: 0.2px;
    font-family: "Roboto";
  }
  .google-btn:hover {
    box-shadow: 0 0 6px #0078d4;
    cursor: pointer;
  }
  .google-btn:active {
    background: #106ebe;
  }
`

const AzureButtonWrapper = styled.section`
  @import url(https://fonts.googleapis.com/css?family=Roboto:500);
  .azure-btn {
    width: 220px;
    height: 42px;
    background-color: #0078d4;
    border-radius: 2px;
    box-shadow: 0 3px 4px 0 rgba(0, 0, 0, .25);
    position: relative;
    display: flex;
    align-items: center;
  }
  .azure-btn .icon-wrapper {
    position: absolute;
    left: 1px;
    width: 40px;
    height: 40px;
    border-radius: 2px;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .azure-btn .icon {
    width: 18px;
    height: 18px;
  }
  .azure-btn .btn-text {
    flex: 1;
    text-align: center;
    padding-left: 20px;
    color: #fff;
    font-size: 14px;
    letter-spacing: 0.2px;
    font-family: "Roboto";
  }
  .azure-btn:hover {
    box-shadow: 0 0 6px #0078d4;
    cursor: pointer;
  }
  .azure-btn:active {
    background: #106ebe;
  }
`

export { Login };
export type { LoginProps };
