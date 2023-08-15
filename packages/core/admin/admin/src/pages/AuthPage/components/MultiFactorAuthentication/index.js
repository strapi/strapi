import React from 'react';

import { Box, Button, Flex, Main, TextInput, Typography } from '@strapi/design-system';
import { Form } from '@strapi/helper-plugin';
import { Formik } from 'formik';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import Logo from '../../../../components/UnauthenticatedLogo';
import UnauthenticatedLayout, {
  Column,
  LayoutContent,
} from '../../../../layouts/UnauthenticatedLayout';

const MultiFactorAuthentication = ({ onSubmit, schema }) => {
  const { formatMessage } = useIntl();

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
          <Formik
            enableReinitialize
            initialValues={{
              code: '',
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
                        id: 'app.containers.AuthPage.MultiFactorAuthentication.title',
                        defaultMessage: 'Two Factor Authentication',
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

                <Flex direction="column" alignItems="stretch" gap={6}>
                  <TextInput
                    error={
                      errors.code
                        ? formatMessage({
                          id: errors.code,
                          defaultMessage: 'This code is invalid.',
                        })
                        : ''
                    }
                    value={values.code}
                    onChange={handleChange}
                    label={formatMessage({ id: 'Auth.form.code.label', defaultMessage: 'Code' })}
                    placeholder={formatMessage({
                      id: 'Auth.form.code.placeholder',
                      defaultMessage: 'Enter your 6 digit code from email',
                    })}
                    name="code"
                    required
                  />
                  <Button type="submit" fullWidth>
                    {formatMessage({
                      id: 'Auth.form.button.multi-factor-authentication',
                      defaultMessage: 'Submit',
                    })}
                  </Button>
                </Flex>
              </Form>
            )}
          </Formik>
        </LayoutContent>
      </Main>
    </UnauthenticatedLayout>
  );
};

MultiFactorAuthentication.defaultProps = {
  onSubmit: (e) => e.preventDefault(),
};

MultiFactorAuthentication.propTypes = {
  onSubmit: PropTypes.func,
  schema: PropTypes.shape({
    type: PropTypes.number.isRequired,
  }).isRequired,
};

export default MultiFactorAuthentication;
