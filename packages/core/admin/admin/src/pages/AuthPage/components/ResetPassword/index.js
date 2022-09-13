import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Formik } from 'formik';
import { Form, Link } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Main } from '@strapi/design-system/Main';
import { Flex } from '@strapi/design-system/Flex';
import { Button } from '@strapi/design-system/Button';
import { TextInput } from '@strapi/design-system/TextInput';
import { Typography } from '@strapi/design-system/Typography';
import EyeStriked from '@strapi/icons/EyeStriked';
import Eye from '@strapi/icons/Eye';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import Logo from '../../../../components/UnauthenticatedLogo';
import FieldActionWrapper from '../FieldActionWrapper';

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

const ForgotPassword = ({ onSubmit, schema }) => {
  const [passwordShown, setPasswordShown] = useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Formik
            enableReinitialize
            initialValues={{
              password: '',
              confirmPassword: '',
            }}
            onSubmit={onSubmit}
            validationSchema={schema}
            validateOnChange={false}
          >
            {({ values, errors, handleChange }) => (
              <Form noValidate>
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
                  {errors.errorMessage && (
                    <Typography
                      id="global-form-error"
                      role="alert"
                      tabIndex={-1}
                      textColor="danger600"
                    >
                      {formatMessage({
                        id: errors.errorMessage,
                        defaultMessage: 'An error occurred',
                      })}
                    </Typography>
                  )}
                </Column>

                <Stack spacing={6}>
                  <PasswordInput
                    name="password"
                    onChange={handleChange}
                    value={values.password}
                    error={
                      errors.password
                        ? formatMessage({
                            id: errors.password,
                            defaultMessage: 'This field is required.',
                          })
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
                      defaultMessage: 'Confirmation Password',
                    })}
                    type={confirmPasswordShown ? 'text' : 'password'}
                  />
                  <Button fullwidth type="submit">
                    {formatMessage({
                      id: 'global.change-password',
                      defaultMessage: 'Change password',
                    })}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </LayoutContent>
        <Flex justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/login">
              {formatMessage({ id: 'Auth.link.ready', defaultMessage: 'Ready to sign in?' })}
            </Link>
          </Box>
        </Flex>
      </Main>
    </UnauthenticatedLayout>
  );
};

ForgotPassword.defaultProps = {
  onSubmit: (e) => e.preventDefault(),
};

ForgotPassword.propTypes = {
  onSubmit: PropTypes.func,
  schema: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
};

export default ForgotPassword;
