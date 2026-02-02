import { Box, Button, Flex, Main, Typography, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate } from 'react-router-dom';
import * as yup from 'yup';

import { Form } from '../../../components/Form';
import { InputRenderer } from '../../../components/FormInputs/Renderer';
import { Logo } from '../../../components/UnauthenticatedLogo';
import { useAPIErrorHandler } from '../../../hooks/useAPIErrorHandler';
import {
  Column,
  LayoutContent,
  UnauthenticatedLayout,
} from '../../../layouts/UnauthenticatedLayout';
import { useForgotPasswordMutation } from '../../../services/auth';
import { isBaseQueryError } from '../../../utils/baseQuery';
import { translatedErrors } from '../../../utils/translatedErrors';

import type { ForgotPassword } from '../../../../../shared/contracts/authentication';

const ForgotPassword = () => {
  const navigate = useNavigate();
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
              <Typography tag="h1" variant="alpha">
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
          <Form
            method="POST"
            initialValues={{
              email: '',
            }}
            onSubmit={async (body) => {
              const res = await forgotPassword(body);

              if (!('error' in res)) {
                navigate('/auth/forgot-password-success');
              }
            }}
            validationSchema={yup.object().shape({
              email: yup
                .string()
                .email(translatedErrors.email)
                .required({
                  id: translatedErrors.required.id,
                  defaultMessage: 'This field is required.',
                })
                .nullable(),
            })}
          >
            <Flex direction="column" alignItems="stretch" gap={6}>
              {[
                {
                  label: formatMessage({ id: 'Auth.form.email.label', defaultMessage: 'Email' }),
                  name: 'email',
                  placeholder: formatMessage({
                    id: 'Auth.form.email.placeholder',
                    defaultMessage: 'kai@doe.com',
                  }),
                  required: true,
                  type: 'string' as const,
                },
              ].map((field) => (
                <InputRenderer key={field.name} {...field} />
              ))}
              <Button type="submit" fullWidth>
                {formatMessage({
                  id: 'Auth.form.button.forgot-password',
                  defaultMessage: 'Send Email',
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

export { ForgotPassword };
