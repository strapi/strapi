import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Form } from '@strapi/helper-plugin';
import { Box, Stack, H1, Text, TextInput, Main, Row, Link } from '@strapi/parts';
import { Show, Hide } from '@strapi/icons';
import { Formik } from 'formik';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import AuthButton from '../AuthButton';
import Logo from '../Logo';
import FieldActionWrapper from '../FieldActionWrapper';

const ForgotPassword = ({ onSubmit, schema }) => {
  const [passwordShown, setPasswordShown] = useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <UnauthenticatedLayout>
      <Main labelledBy="password-forgotten">
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
                  <Box paddingTop="6" paddingBottom="7">
                    <H1 id="password-forgotten">
                      {formatMessage({ id: 'Auth.reset-password.title' })}
                    </H1>
                  </Box>
                  {errors.errorMessage && (
                    <Text id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
                      {formatMessage({ id: errors.errorMessage })}
                    </Text>
                  )}
                </Column>

                <Stack size={6}>
                  <TextInput
                    name="password"
                    onChange={handleChange}
                    value={values.password}
                    error={errors.password ? formatMessage({ id: errors.password }) : undefined}
                    endAction={
                      <FieldActionWrapper
                        onClick={e => {
                          e.preventDefault();
                          setPasswordShown(prev => !prev);
                        }}
                        label={formatMessage({
                          id: passwordShown
                            ? 'Auth.form.password.show-password'
                            : 'Auth.form.password.hide-password',
                        })}
                      >
                        {passwordShown ? <Show /> : <Hide />}
                      </FieldActionWrapper>
                    }
                    hint={formatMessage({ id: 'Auth.form.password.hint' })}
                    required
                    label={formatMessage({ id: 'Auth.form.password.label' })}
                    type={passwordShown ? 'text' : 'password'}
                  />
                  <TextInput
                    name="confirmPassword"
                    onChange={handleChange}
                    value={values.confirmPassword}
                    error={
                      errors.confirmPassword
                        ? formatMessage({ id: errors.confirmPassword })
                        : undefined
                    }
                    endAction={
                      <FieldActionWrapper
                        onClick={e => {
                          e.preventDefault();
                          setConfirmPasswordShown(prev => !prev);
                        }}
                        label={formatMessage({
                          id: confirmPasswordShown
                            ? 'Auth.form.password.show-password'
                            : 'Auth.form.password.hide-password',
                        })}
                      >
                        {confirmPasswordShown ? <Show /> : <Hide />}
                      </FieldActionWrapper>
                    }
                    required
                    label={formatMessage({ id: 'Auth.form.confirmPassword.label' })}
                    type={confirmPasswordShown ? 'text' : 'password'}
                  />
                  <AuthButton type="submit">
                    {formatMessage({ id: 'Auth.form.button.reset-password' })}
                  </AuthButton>
                </Stack>
              </Form>
            )}
          </Formik>
        </LayoutContent>
        <Row justifyContent="center">
          <Box paddingTop={4}>
            <Link to="/auth/login">
              <Text small>{formatMessage({ id: 'Auth.link.ready' })}</Text>
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
