import * as React from 'react';

import {
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  GridItem,
  Main,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import {
  Form,
  auth,
  getYupInnerErrors,
  translatedErrors,
  useAPIErrorHandler,
  useGuidedTour,
  useNotification,
  useQuery,
  useTracking,
} from '@strapi/helper-plugin';
import { Eye, EyeStriked } from '@strapi/icons';
import { Formik, FormikHelpers } from 'formik';
import omit from 'lodash/omit';
import { MessageDescriptor, useIntl } from 'react-intl';
import { NavLink, Redirect, useHistory, useRouteMatch } from 'react-router-dom';
import styled from 'styled-components';
import * as yup from 'yup';
import { ValidationError } from 'yup';

import {
  Register as RegisterUser,
  RegisterAdmin,
} from '../../../../../shared/contracts/authentication';
import { useNpsSurveySettings } from '../../../components/NpsSurvey';
import { Logo } from '../../../components/UnauthenticatedLogo';
import { useAuth } from '../../../features/Auth';
import { LayoutContent, UnauthenticatedLayout } from '../../../layouts/UnauthenticatedLayout';
import {
  useGetRegistrationInfoQuery,
  useRegisterAdminMutation,
  useRegisterUserMutation,
} from '../../../services/auth';
import { isBaseQueryError } from '../../../utils/baseQuery';
import { AuthType } from '../constants';

import { FieldActionWrapper } from './FieldActionWrapper';

const REGISTER_USER_SCHEMA = yup.object().shape({
  firstname: yup.string().trim().required(translatedErrors.required),
  lastname: yup.string().nullable(),
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
  registrationToken: yup.string().required(translatedErrors.required),
});

const REGISTER_ADMIN_SCHEMA = yup.object().shape({
  firstname: yup.string().trim().required(translatedErrors.required),
  lastname: yup.string().nullable(),
  password: yup
    .string()
    .min(8, translatedErrors.minLength)
    .matches(/[a-z]/, 'components.Input.error.contain.lowercase')
    .matches(/[A-Z]/, 'components.Input.error.contain.uppercase')
    .matches(/\d/, 'components.Input.error.contain.number')
    .required(translatedErrors.required),
  email: yup
    .string()
    .email(translatedErrors.email)
    .strict()
    .lowercase(translatedErrors.lowercase)
    .required(translatedErrors.required),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'components.Input.error.password.noMatch')
    .required(translatedErrors.required),
});

interface RegisterProps {
  hasAdmin?: boolean;
}

interface RegisterFormValues {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
  registrationToken: string | undefined;
  news: boolean;
}

const Register = ({ hasAdmin }: RegisterProps) => {
  const toggleNotification = useNotification();
  const { push } = useHistory();
  const [passwordShown, setPasswordShown] = React.useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = React.useState(false);
  const [submitCount, setSubmitCount] = React.useState(0);
  const [apiError, setApiError] = React.useState<string>();
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { setSkipped } = useGuidedTour();
  const query = useQuery();
  const match = useRouteMatch<{ authType: Extract<AuthType, `register${string}`> }>(
    '/auth/:authType'
  );
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const { setNpsSurveySettings } = useNpsSurveySettings();

  const registrationToken = query.get('registrationToken');

  const { data: userInfo, error } = useGetRegistrationInfoQuery(registrationToken as string, {
    skip: !registrationToken,
  });

  React.useEffect(() => {
    if (error) {
      const message: string = isBaseQueryError(error) ? formatAPIError(error) : error.message ?? '';

      toggleNotification({
        type: 'warning',
        message,
      });

      push(`/auth/oops?info=${encodeURIComponent(message)}`);
    }
  }, [error, formatAPIError, push, toggleNotification]);

  const [registerAdmin] = useRegisterAdminMutation();
  const [registerUser] = useRegisterUserMutation();
  const setToken = useAuth('Register', (state) => state.setToken);

  const handleRegisterAdmin = async (
    { news, ...body }: RegisterAdmin.Request['body'] & { news: boolean },
    setFormErrors: FormikHelpers<RegisterFormValues>['setErrors']
  ) => {
    const res = await registerAdmin(body);

    if ('data' in res) {
      setToken(res.data.token);

      const { roles } = res.data.user;

      if (roles) {
        const isUserSuperAdmin = roles.find(({ code }) => code === 'strapi-super-admin');

        if (isUserSuperAdmin) {
          auth.set(false, 'GUIDED_TOUR_SKIPPED', true);
          setSkipped(false);
          trackUsage('didLaunchGuidedtour');
        }
      }

      if (news) {
        // Only enable EE survey if user accepted the newsletter
        setNpsSurveySettings((s) => ({ ...s, enabled: true }));

        push({
          pathname: '/usecase',
          search: `?hasAdmin=${true}`,
        });
      } else {
        push('/');
      }
    } else {
      if (isBaseQueryError(res.error)) {
        trackUsage('didNotCreateFirstAdmin');

        if (res.error.name === 'ValidationError') {
          setFormErrors(formatValidationErrors(res.error));
          return;
        }

        setApiError(formatAPIError(res.error));
      }
    }
  };

  const handleRegisterUser = async (
    { news, ...body }: RegisterUser.Request['body'] & { news: boolean },
    setFormErrors: FormikHelpers<RegisterFormValues>['setErrors']
  ) => {
    const res = await registerUser(body);

    if ('data' in res) {
      setToken(res.data.token);

      if (news) {
        // Only enable EE survey if user accepted the newsletter
        setNpsSurveySettings((s) => ({ ...s, enabled: true }));

        push({
          pathname: '/usecase',
          search: `?hasAdmin=${hasAdmin}`,
        });
      } else {
        push('/');
      }
    } else {
      if (isBaseQueryError(res.error)) {
        trackUsage('didNotCreateFirstAdmin');

        if (res.error.name === 'ValidationError') {
          setFormErrors(formatValidationErrors(res.error));
          return;
        }

        setApiError(formatAPIError(res.error));
      }
    }
  };

  if (
    !match ||
    (match.params.authType !== 'register' && match.params.authType !== 'register-admin')
  ) {
    return <Redirect to="/" />;
  }

  const isAdminRegistration = match.params.authType === 'register-admin';

  const schema = isAdminRegistration ? REGISTER_ADMIN_SCHEMA : REGISTER_USER_SCHEMA;

  return (
    <UnauthenticatedLayout>
      <LayoutContent>
        <Flex direction="column" alignItems="center" gap={3}>
          <Logo />

          <Typography as="h1" variant="alpha" textAlign="center">
            {formatMessage({
              id: 'Auth.form.welcome.title',
              defaultMessage: 'Welcome to Strapi!',
            })}
          </Typography>
          <Typography variant="epsilon" textColor="neutral600" textAlign="center">
            {formatMessage({
              id: 'Auth.form.register.subtitle',
              defaultMessage:
                'Credentials are only used to authenticate in Strapi. All saved data will be stored in your database.',
            })}
          </Typography>
          {apiError ? (
            <Typography id="global-form-error" role="alert" tabIndex={-1} textColor="danger600">
              {apiError}
            </Typography>
          ) : null}
        </Flex>
        <Formik
          enableReinitialize
          initialValues={
            {
              firstname: userInfo?.firstname || '',
              lastname: userInfo?.lastname || '',
              email: userInfo?.email || '',
              password: '',
              confirmPassword: '',
              registrationToken: registrationToken || undefined,
              news: false,
            } satisfies RegisterFormValues
          }
          onSubmit={async (data, formik) => {
            const normalizedData = normalizeData(data);

            try {
              await schema.validate(normalizedData, { abortEarly: false });

              if (submitCount > 0 && isAdminRegistration) {
                trackUsage('didSubmitWithErrorsFirstAdmin', { count: submitCount.toString() });
              }

              if (normalizedData.registrationToken) {
                handleRegisterUser(
                  {
                    userInfo: omit(normalizedData, [
                      'registrationToken',
                      'confirmPassword',
                      'email',
                      'news',
                    ]),
                    registrationToken: normalizedData.registrationToken,
                    news: normalizedData.news,
                  },
                  formik.setErrors
                );
              } else {
                await handleRegisterAdmin(
                  omit(normalizedData, ['registrationToken', 'confirmPassword']),
                  formik.setErrors
                );
              }
            } catch (err) {
              if (err instanceof ValidationError) {
                const errors = getYupInnerErrors(err);

                formik.setErrors(errors);
              }
              setSubmitCount(submitCount + 1);
            }
          }}
          validateOnChange={false}
        >
          {({ values, errors, handleChange }) => {
            return (
              <Form>
                <Main>
                  <Flex direction="column" alignItems="stretch" gap={6} marginTop={7}>
                    <Grid gap={4}>
                      <GridItem col={6}>
                        <TextInput
                          name="firstname"
                          required
                          value={values.firstname}
                          error={
                            errors.firstname
                              ? formatMessage(errors.firstname as MessageDescriptor)
                              : undefined
                          }
                          onChange={handleChange}
                          label={formatMessage({
                            id: 'Auth.form.firstname.label',
                            defaultMessage: 'Firstname',
                          })}
                        />
                      </GridItem>
                      <GridItem col={6}>
                        <TextInput
                          name="lastname"
                          value={values.lastname}
                          onChange={handleChange}
                          label={formatMessage({
                            id: 'Auth.form.lastname.label',
                            defaultMessage: 'Lastname',
                          })}
                        />
                      </GridItem>
                    </Grid>
                    <TextInput
                      name="email"
                      disabled={!isAdminRegistration}
                      value={values.email}
                      onChange={handleChange}
                      error={
                        errors.email ? formatMessage(errors.email as MessageDescriptor) : undefined
                      }
                      required
                      label={formatMessage({
                        id: 'Auth.form.email.label',
                        defaultMessage: 'Email',
                      })}
                      type="email"
                    />
                    <PasswordInput
                      name="password"
                      onChange={handleChange}
                      value={values.password}
                      error={
                        errors.password
                          ? formatMessage(errors.password as MessageDescriptor)
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
                          'Must be at least 8 characters, 1 uppercase, 1 lowercase & 1 number',
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
                          ? formatMessage(errors.confirmPassword as MessageDescriptor)
                          : undefined
                      }
                      endAction={
                        <FieldActionWrapper
                          onClick={(e) => {
                            e.preventDefault();
                            setConfirmPasswordShown((prev) => !prev);
                          }}
                          label={formatMessage(
                            confirmPasswordShown
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
                    <Checkbox
                      onValueChange={(checked) => {
                        handleChange({ target: { value: checked, name: 'news' } });
                      }}
                      value={values.news}
                      name="news"
                      aria-label="news"
                    >
                      {formatMessage(
                        {
                          id: 'Auth.form.register.news.label',
                          defaultMessage:
                            'Keep me updated about new features & upcoming improvements (by doing this you accept the {terms} and the {policy}).',
                        },
                        {
                          terms: (
                            <A target="_blank" href="https://strapi.io/terms" rel="noreferrer">
                              {formatMessage({
                                id: 'Auth.privacy-policy-agreement.terms',
                                defaultMessage: 'terms',
                              })}
                            </A>
                          ),
                          policy: (
                            <A target="_blank" href="https://strapi.io/privacy" rel="noreferrer">
                              {formatMessage({
                                id: 'Auth.privacy-policy-agreement.policy',
                                defaultMessage: 'policy',
                              })}
                            </A>
                          ),
                        }
                      )}
                    </Checkbox>
                    <Button fullWidth size="L" type="submit">
                      {formatMessage({
                        id: 'Auth.form.button.register',
                        defaultMessage: "Let's start",
                      })}
                    </Button>
                  </Flex>
                </Main>
              </Form>
            );
          }}
        </Formik>
        {match?.params.authType === 'register' && (
          <Box paddingTop={4}>
            <Flex justifyContent="center">
              {/* @ts-expect-error – error with inferring the props from the as component */}
              <Link as={NavLink} to="/auth/login">
                {formatMessage({
                  id: 'Auth.link.signin.account',
                  defaultMessage: 'Already have an account?',
                })}
              </Link>
            </Flex>
          </Box>
        )}
      </LayoutContent>
    </UnauthenticatedLayout>
  );
};

interface RegisterFormValues {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  confirmPassword: string;
  registrationToken: string | undefined;
  news: boolean;
}

type StringKeys<T> = {
  [K in keyof T]: T[K] extends string | undefined ? K : never;
}[keyof T];

/**
 * @description Trims all values but the password & sets lastName to null if it's a falsey value.
 */
function normalizeData(data: RegisterFormValues) {
  return Object.entries(data).reduce(
    (acc, [key, value]) => {
      type PasswordKeys = Extract<keyof RegisterFormValues, 'password' | 'confirmPassword'>;
      type RegisterFormStringValues = Exclude<
        keyof Pick<RegisterFormValues, StringKeys<RegisterFormValues>>,
        PasswordKeys
      >;

      if (!['password', 'confirmPassword'].includes(key) && typeof value === 'string') {
        acc[key as RegisterFormStringValues] = value.trim();

        if (key === 'lastname') {
          acc[key] = value || undefined;
        }
      } else {
        acc[key as PasswordKeys] = value;
      }

      return acc;
    },
    {} as {
      firstname: string;
      lastname: string | undefined;
      email: string;
      password: string;
      confirmPassword: string;
      registrationToken: string | undefined;
      news: boolean;
    }
  );
}

const A = styled.a`
  color: ${({ theme }) => theme.colors.primary600};
`;

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

export { Register };
export type { RegisterProps };
