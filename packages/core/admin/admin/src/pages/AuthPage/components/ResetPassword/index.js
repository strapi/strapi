import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Form } from '@strapi/helper-plugin';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { Main } from '@strapi/parts/Main';
import { Row } from '@strapi/parts/Row';
import { Link } from '@strapi/parts/Link';
import { Button } from '@strapi/parts/Button';
import { TextInput } from '@strapi/parts/TextInput';
import { H1, Text } from '@strapi/parts/Text';
import Hide from '@strapi/icons/Hide';
import Show from '@strapi/icons/Show';
import { Formik } from 'formik';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import Logo from '../Logo';
import FieldActionWrapper from '../FieldActionWrapper';

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
                    <H1>
                      {formatMessage({
                        id: 'Auth.reset-password.title',
                        defaultMessage: 'Reset password',
                      })}
                    </H1>
                  </Box>
                  {errors.errorMessage && (
                    <Text id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
                      {formatMessage({
                        id: errors.errorMessage,
                        defaultMessage: 'An error occurred',
                      })}
                    </Text>
                  )}
                </Column>

                <Stack size={6}>
                  <TextInput
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
                        onClick={e => {
                          e.preventDefault();
                          setPasswordShown(prev => !prev);
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
                        {passwordShown ? <Show /> : <Hide />}
                      </FieldActionWrapper>
                    }
                    hint={formatMessage({
                      id: 'Auth.form.password.hint',
                      defaultMessage:
                        'Password must contain at least 8 characters, 1 uppercase, 1 lowercase and 1 number',
                    })}
                    required
                    label={formatMessage({
                      id: 'Auth.form.password.label',
                      defaultMessage: 'Password',
                    })}
                    type={passwordShown ? 'text' : 'password'}
                  />
                  <TextInput
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
                        onClick={e => {
                          e.preventDefault();
                          setConfirmPasswordShown(prev => !prev);
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
                        {confirmPasswordShown ? <Show /> : <Hide />}
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
                      id: 'Auth.form.button.reset-password',
                      defaultMessage: 'Change password',
                    })}
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </LayoutContent>
        <Row justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/login">
              <Text small>
                {formatMessage({ id: 'Auth.link.ready', defaultMessage: 'Ready to sign in?' })}
              </Text>
            </Link>
          </Box>
        </Row>
      </Main>
    </UnauthenticatedLayout>
  );
};

ForgotPassword.defaultProps = {
  onSubmit: e => e.preventDefault(),
};

ForgotPassword.propTypes = {
  onSubmit: PropTypes.func,
  schema: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
};

export default ForgotPassword;
