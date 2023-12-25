import * as React from 'react';

import { Box, Button, Flex, Main, TextInput, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { Form, auth, translatedErrors, useFetchClient, useQuery } from '@strapi/helper-plugin';
import { Eye, EyeStriked } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { NavLink, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';

import { ResetPassword } from '../../../../../shared/contracts/authentication';
import { Logo } from '../../../components/UnauthenticatedLogo';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../layouts/UnauthenticatedLayout';

import { FieldActionWrapper } from './FieldActionWrapper';

const RESET_PASSWORD_SCHEMA = yup.object().shape({
  password: yup
    .string()
    .min(8, translatedErrors.minLength)
    .matches(/[a-z]/, 'components.Input.error.contain.lowercase')
    .matches(/[A-Z]/, 'components.Input.error.contain.uppercase')
    .matches(/\d/, 'components.Input.error.contain.number')
    .required(translatedErrors.required),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'components.Input.error.password.noMatch')
    .required(translatedErrors.required),
});

const ResetPassword = () => {
  const [passwordShown, setPasswordShown] = React.useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = React.useState(false);
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { push } = useHistory();
  const query = useQuery();

  const { mutate, isError } = useMutation(
    async (body: Pick<ResetPassword.Request['body'], 'password'>) => {
      const {
        data: { data },
      } = await post<ResetPassword.Response>('/admin/reset-password', {
        ...body,
        resetPasswordToken: query.get('code'),
      });

      return data;
    },
    {
      onSuccess(data) {
        if (data) {
          const { token, user } = data;
          auth.setToken(token, false);
          auth.setUserInfo(user, false);

          // Redirect to the homePage
          push('/');
        }
      },
    }
  );

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Column>
            <Logo />
            <Box paddingTop={6} paddingBottom={7}>
              <Typography as="h1" variant="alpha">
                {formatMessage({
                  id: 'global.reset-password',
                  defaultMessage: 'Reset password',
                })}
              </Typography>
            </Box>
            {isError ? (
              <Typography id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
                {formatMessage({
                  id: 'notification.error',
                  defaultMessage: 'An error occurred',
                })}
              </Typography>
            ) : null}
          </Column>
          <Formik
            enableReinitialize
            initialValues={{
              password: '',
              confirmPassword: '',
            }}
            onSubmit={(values) => {
              mutate({ password: values.password });
            }}
            validationSchema={RESET_PASSWORD_SCHEMA}
            validateOnChange={false}
          >
            {({ values, errors, handleChange }) => (
              <Form>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  <PasswordInput
                    name="password"
                    onChange={handleChange}
                    value={values.password}
                    error={
                      errors.password
                        ? formatMessage(
                            {
                              id: errors.password,
                              defaultMessage: 'This field is required.',
                            },
                            {
                              min: 8,
                            }
                          )
                        : undefined
                    }
                    endAction={
                      <FieldActionWrapper
                        onClick={(e) => {
                          e.preventDefault();
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
                    hint={formatMessage({
                      id: 'Auth.form.password.hint',
                      defaultMessage:
                        'Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 number',
                    })}
                    required
                    label={formatMessage({
                      id: 'global.password',
                      defaultMessage: 'Password',
                    })}
                    type={passwordShown ? 'text' : 'password'}
                  />
                  <PasswordInput
                    name="confirmPassword"
                    onChange={handleChange}
                    value={values.confirmPassword}
                    error={
                      errors.confirmPassword
                        ? formatMessage({
                            id: errors.confirmPassword,
                            defaultMessage: 'This value is required.',
                          })
                        : undefined
                    }
                    endAction={
                      <FieldActionWrapper
                        onClick={(e) => {
                          e.preventDefault();
                          setConfirmPasswordShown((prev) => !prev);
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
                        {confirmPasswordShown ? <Eye /> : <EyeStriked />}
                      </FieldActionWrapper>
                    }
                    required
                    label={formatMessage({
                      id: 'Auth.form.confirmPassword.label',
                      defaultMessage: 'Confirm Password',
                    })}
                    type={confirmPasswordShown ? 'text' : 'password'}
                  />
                  <Button fullWidth type="submit">
                    {formatMessage({
                      id: 'global.change-password',
                      defaultMessage: 'Change password',
                    })}
                  </Button>
                </Flex>
              </Form>
            )}
          </Formik>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            {/* @ts-expect-error – error with inferring the props from the as component */}
            <Link as={NavLink} to="/auth/login">
              {formatMessage({ id: 'Auth.link.ready', defaultMessage: 'Ready to sign in?' })}
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

export { ResetPassword };
