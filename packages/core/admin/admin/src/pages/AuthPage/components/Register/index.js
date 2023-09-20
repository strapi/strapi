import React, { useEffect, useState } from 'react';

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
import {
  Form,
  getYupInnerErrors,
  Link,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useQuery,
  useTracking,
} from '@strapi/helper-plugin';
import { Eye, EyeStriked } from '@strapi/icons';
import { Formik } from 'formik';
import omit from 'lodash/omit';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { useNpsSurveySettings } from '../../../../components/NpsSurvey/hooks/useNpsSurveySettings';
import Logo from '../../../../components/UnauthenticatedLogo';
import UnauthenticatedLayout, { LayoutContent } from '../../../../layouts/UnauthenticatedLayout';
import FieldActionWrapper from '../FieldActionWrapper';

const A = styled.a`
  color: ${({ theme }) => theme.colors.primary600};
`;

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

const Register = ({ authType, fieldsToDisable, noSignin, onSubmit, schema }) => {
  const toggleNotification = useNotification();
  const { push } = useHistory();
  const [passwordShown, setPasswordShown] = useState(false);
  const [confirmPasswordShown, setConfirmPasswordShown] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [userInfo, setUserInfo] = useState({});
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const query = useQuery();
  const { formatAPIError } = useAPIErrorHandler();
  const { get } = useFetchClient();
  const { setNpsSurveySettings } = useNpsSurveySettings();

  const registrationToken = query.get('registrationToken');

  useEffect(() => {
    if (registrationToken) {
      const getData = async () => {
        try {
          const {
            data: { data },
          } = await get(`/admin/registration-info`, {
            params: {
              registrationToken,
            },
          });

          if (data) {
            setUserInfo(data);
          }
        } catch (error) {
          const message = formatAPIError(error);

          toggleNotification({
            type: 'warning',
            message,
          });

          // Redirect to the oops page in case of an invalid token
          // @alexandrebodin @JAB I am not sure it is the wanted behavior
          push(`/auth/oops?info=${encodeURIComponent(message)}`);
        }
      };

      getData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationToken]);

  function normalizeData(data) {
    return Object.entries(data).reduce((acc, [key, value]) => {
      let normalizedvalue = value;

      if (!['password', 'confirmPassword'].includes(key) && typeof value === 'string') {
        normalizedvalue = normalizedvalue.trim();

        if (key === 'lastname') {
          normalizedvalue = normalizedvalue || null;
        }
      }

      acc[key] = normalizedvalue;

      return acc;
    }, {});
  }

  return (
    <UnauthenticatedLayout>
      <LayoutContent>
        <Formik
          enableReinitialize
          initialValues={{
            firstname: userInfo.firstname || '',
            lastname: userInfo.lastname || '',
            email: userInfo.email || '',
            password: '',
            confirmPassword: '',
            registrationToken: registrationToken || undefined,
            news: false,
          }}
          onSubmit={async (data, formik) => {
            const normalizedData = normalizeData(data);

            try {
              await schema.validate(normalizedData, { abortEarly: false });

              if (submitCount > 0 && authType === 'register-admin') {
                trackUsage('didSubmitWithErrorsFirstAdmin', { count: submitCount.toString() });
              }

              if (registrationToken) {
                // We need to pass the registration token in the url param to the api in order to submit another admin user
                onSubmit(
                  { userInfo: omit(normalizedData, ['registrationToken']), registrationToken },
                  formik
                );
              } else {
                onSubmit(normalizedData, formik);
              }

              // Only enable EE survey if user accepted the newsletter
              setNpsSurveySettings({ enabled: data.news });
            } catch (err) {
              const errors = getYupInnerErrors(err);
              setSubmitCount(submitCount + 1);

              formik.setErrors(errors);
            }
          }}
          // Leaving this part commented when we remove the tracking for the submitCount
          // validationSchema={schema}
          validateOnChange={false}
        >
          {({ values, errors, handleChange }) => {
            return (
              <Form noValidate>
                <Main>
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
                  </Flex>

                  <Flex direction="column" alignItems="stretch" gap={6} marginTop={7}>
                    <Grid gap={4}>
                      <GridItem col={6}>
                        <TextInput
                          name="firstname"
                          required
                          value={values.firstname}
                          error={errors.firstname ? formatMessage(errors.firstname) : undefined}
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
                      disabled={fieldsToDisable.includes('email')}
                      value={values.email}
                      onChange={handleChange}
                      error={errors.email ? formatMessage(errors.email) : undefined}
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
                      error={errors.password ? formatMessage(errors.password) : undefined}
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
                        errors.confirmPassword ? formatMessage(errors.confirmPassword) : undefined
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
        {!noSignin && (
          <Box paddingTop={4}>
            <Flex justifyContent="center">
              <Link label="Auth.link.signin" to="/auth/login">
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

Register.defaultProps = {
  fieldsToDisable: [],
  noSignin: false,
  onSubmit: (e) => e.preventDefault(),
};

Register.propTypes = {
  authType: PropTypes.string.isRequired,
  fieldsToDisable: PropTypes.array,
  noSignin: PropTypes.bool,
  onSubmit: PropTypes.func,
  schema: PropTypes.shape({
    validate: PropTypes.func.isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
};

export default Register;
