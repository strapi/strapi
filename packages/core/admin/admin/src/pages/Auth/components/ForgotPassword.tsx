import { Box, Button, Flex, Main, TextInput, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { Form, translatedErrors, useAPIErrorHandler } from '@strapi/helper-plugin';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { NavLink, useHistory } from 'react-router-dom';
import * as yup from 'yup';

import { Logo } from '../../../components/UnauthenticatedLogo';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../layouts/UnauthenticatedLayout';
import { useForgotPasswordMutation } from '../../../services/auth';
import { isBaseQueryError } from '../../../utils/baseQuery';

import type { ForgotPassword } from '../../../../../shared/contracts/authentication';

const ForgotPassword = () => {
  const { push } = useHistory();
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [forgotPassword, { error }] = useForgotPasswordMutation();

  return (
    <UnauthenticatedLayout>
      <Main>
        <LayoutContent>
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
          <Formik
            enableReinitialize
            initialValues={{
              email: '',
            }}
            onSubmit={async (body) => {
              const res = await forgotPassword(body);

              if (!('error' in res)) {
                push('/auth/forgot-password-success');
              }
            }}
            validationSchema={yup.object().shape({
              email: yup.string().email(translatedErrors.email).required(translatedErrors.required),
            })}
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

export { ForgotPassword };
