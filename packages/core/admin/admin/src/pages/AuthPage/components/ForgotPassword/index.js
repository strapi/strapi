import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Form, Link } from '@strapi/helper-plugin';
import { Box, Stack, Main, Flex, Button, TextInput, Typography } from '@strapi/design-system';
import { Formik } from 'formik';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';
import Logo from '../../../../components/UnauthenticatedLogo';

const ForgotPassword = ({ onSubmit, schema }) => {
  const { formatMessage } = useIntl();

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Formik
            enableReinitialize
            initialValues={{
              email: '',
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
                        id: 'Auth.form.button.password-recovery',
                        defaultMessage: 'Password Recovery',
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
                  <TextInput
                    error={
                      errors.email
                        ? formatMessage({
                            id: errors.email,
                            defaultMessage: 'This email is invalid.',
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
                  <Button type="submit" fullWidth>
                    {formatMessage({
                      id: 'Auth.form.button.forgot-password',
                      defaultMessage: 'Send Email',
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
