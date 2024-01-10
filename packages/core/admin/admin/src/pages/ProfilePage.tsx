import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  HeaderLayout,
  Main,
  useNotifyAT,
  Grid,
  GridItem,
  Typography,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  FieldAction,
} from '@strapi/design-system';
import {
  Form,
  GenericInput,
  GenericInputProps,
  LoadingIndicatorPage,
  pxToRem,
  translatedErrors,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useTracking,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { Check, Eye, EyeStriked } from '@strapi/icons';
import { Formik, FormikHelpers } from 'formik';
import upperFirst from 'lodash/upperFirst';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import * as yup from 'yup';

import { useTypedDispatch, useTypedSelector } from '../core/store/hooks';
import { useAuth } from '../features/Auth';
import { AppState, setAppTheme } from '../reducer';
import { useIsSSOLockedQuery, useUpdateMeMutation } from '../services/auth';
import { isBaseQueryError } from '../utils/baseQuery';
import { getFullName } from '../utils/getFullName';

import { COMMON_USER_SCHEMA } from './Settings/pages/Users/utils/validation';

import type { UpdateMe } from '../../../shared/contracts/users';

const PROFILE_VALIDTION_SCHEMA = yup.object().shape({
  ...COMMON_USER_SCHEMA,
  currentPassword: yup
    .string()
    // @ts-expect-error – no idea why this is failing.
    .when(['password', 'confirmPassword'], (password, confirmPassword, passSchema) => {
      return password || confirmPassword
        ? passSchema.required(translatedErrors.required)
        : passSchema;
    }),
  preferedLanguage: yup.string().nullable(),
});

/* -------------------------------------------------------------------------------------------------
 * ProfilePage
 * -----------------------------------------------------------------------------------------------*/

const ProfilePage = () => {
  const localeNames = useTypedSelector((state) => state.admin_app.language.localeNames);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { notifyStatus } = useNotifyAT();
  const currentTheme = useTypedSelector((state) => state.admin_app.theme.currentTheme);
  const dispatch = useTypedDispatch();
  const {
    _unstableFormatValidationErrors: formatValidationErrors,
    _unstableFormatAPIError: formatApiError,
  } = useAPIErrorHandler();

  useFocusWhenNavigate();

  const user = useAuth('ProfilePage', (state) => state.user);

  React.useEffect(() => {
    if (user) {
      notifyStatus(
        formatMessage({
          id: 'Settings.profile.form.notify.data.loaded',
          defaultMessage: 'Your profile data has been loaded',
        })
      );
    } else {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    }
  }, [formatMessage, notifyStatus, toggleNotification, user]);

  const [updateMe, { isLoading: isSubmittingForm }] = useUpdateMeMutation();

  const {
    isLoading,
    data: dataSSO,
    error,
  } = useIsSSOLockedQuery(undefined, {
    skip: !(window.strapi.isEE && window.strapi.features.isEnabled('sso')),
  });

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: { id: 'Settings.permissions.users.sso.provider.error' },
      });
    }
  }, [error, toggleNotification]);

  type UpdateUsersMeBody = UpdateMe.Request['body'] & {
    confirmPassword: string;
    currentTheme: AppState['theme']['currentTheme'];
  };

  const handleSubmit = async (
    body: UpdateUsersMeBody,
    { setErrors }: FormikHelpers<UpdateUsersMeBody>
  ) => {
    // @ts-expect-error – we're going to implement a context assertion to avoid this
    lockApp();

    const { confirmPassword: _confirmPassword, currentTheme, ...bodyRest } = body;
    let dataToSend = bodyRest;

    // The password fields are optional. If the user didn't touch them, don't send any password
    // to the API, because an empty string would throw a validation error
    if (dataToSend.password === '') {
      const {
        password: _password,
        currentPassword: _currentPassword,
        ...passwordRequestBodyRest
      } = dataToSend;
      dataToSend = passwordRequestBodyRest;
    }

    const res = await updateMe(dataToSend);

    if ('data' in res) {
      dispatch(setAppTheme(currentTheme));

      trackUsage('didChangeMode', { newMode: currentTheme });

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });
    }

    if ('error' in res) {
      if (
        isBaseQueryError(res.error) &&
        (res.error.name === 'ValidationError' || res.error.message === 'ValidationError')
      ) {
        // @ts-expect-error – We get a BadRequest error here instead of a ValidationError if the currentPassword is wrong.
        setErrors(formatValidationErrors(res.error));
      } else if (isBaseQueryError(res.error)) {
        toggleNotification({
          type: 'warning',
          message: formatApiError(res.error),
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      }
    }

    unlockApp?.();
  };

  if (isLoading) {
    return (
      <Main aria-busy="true">
        <Helmet
          title={formatMessage({
            id: 'Settings.profile.form.section.helmet.title',
            defaultMessage: 'User profile',
          })}
        />
        <HeaderLayout
          title={formatMessage({
            id: 'Settings.profile.form.section.profile.page.title',
            defaultMessage: 'Profile page',
          })}
        />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  const hasLockedRole = dataSSO?.isSSOLocked ?? false;
  const { email, firstname, lastname, username, preferedLanguage } = user ?? {};
  const initialData = {
    email,
    firstname,
    lastname,
    username,
    preferedLanguage,
    currentTheme,
    confirmPassword: '',
    password: '',
  };

  return (
    <Main aria-busy={isSubmittingForm}>
      <Helmet
        title={formatMessage({
          id: 'Settings.profile.form.section.helmet.title',
          defaultMessage: 'User profile',
        })}
      />
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialData}
        validateOnChange={false}
        validationSchema={PROFILE_VALIDTION_SCHEMA}
        enableReinitialize
      >
        {({
          errors,
          values: {
            email,
            firstname,
            lastname,
            username,
            preferedLanguage,
            currentTheme,
            ...passwordValues
          },
          handleChange,
          isSubmitting,
          dirty,
        }) => {
          return (
            <Form>
              <HeaderLayout
                title={username || getFullName(firstname ?? '', lastname)}
                primaryAction={
                  <Button
                    startIcon={<Check />}
                    loading={isSubmitting}
                    type="submit"
                    disabled={!dirty}
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                }
              />
              <Box paddingBottom={10}>
                <ContentLayout>
                  <Flex direction="column" alignItems="stretch" gap={6}>
                    <UserInfoSection
                      errors={errors}
                      onChange={handleChange}
                      values={{
                        firstname,
                        lastname,
                        username,
                        email,
                      }}
                    />
                    {!hasLockedRole && (
                      <PasswordSection
                        errors={errors}
                        onChange={handleChange}
                        values={passwordValues}
                      />
                    )}
                    <PreferencesSection
                      onChange={handleChange}
                      values={{
                        preferedLanguage,
                        currentTheme,
                      }}
                      localeNames={localeNames}
                    />
                  </Flex>
                </ContentLayout>
              </Box>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PasswordSection
 * -----------------------------------------------------------------------------------------------*/

interface PasswordSectionProps {
  errors: { currentPassword?: string; password?: string; confirmPassword?: string };
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  values: {
    currentPassword?: string;
    password?: string;
    confirmPassword?: string;
  };
}

const PasswordSection = ({ errors, onChange, values }: PasswordSectionProps) => {
  const { formatMessage } = useIntl();
  const [currentPasswordShown, setCurrentPasswordShown] = React.useState(false);
  const [passwordShown, setPasswordShown] = React.useState(false);
  const [passwordConfirmShown, setPasswordConfirmShown] = React.useState(false);

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: 'global.change-password',
            defaultMessage: 'Change password',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <TextInput
              error={
                errors.currentPassword
                  ? formatMessage({
                      id: errors.currentPassword,
                      defaultMessage: errors.currentPassword,
                    })
                  : ''
              }
              onChange={onChange}
              value={values.currentPassword}
              label={formatMessage({
                id: 'Auth.form.currentPassword.label',
                defaultMessage: 'Current Password',
              })}
              name="currentPassword"
              type={currentPasswordShown ? 'text' : 'password'}
              endAction={
                <FieldActionWrapper
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPasswordShown((prev) => !prev);
                  }}
                  label={formatMessage(
                    currentPasswordShown
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
                  {currentPasswordShown ? <Eye /> : <EyeStriked />}
                </FieldActionWrapper>
              }
            />
          </GridItem>
        </Grid>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <PasswordInput
              error={
                errors.password
                  ? formatMessage({
                      id: errors.password,
                      defaultMessage: errors.password,
                    })
                  : ''
              }
              onChange={onChange}
              value={values.password}
              label={formatMessage({
                id: 'global.password',
                defaultMessage: 'Password',
              })}
              name="password"
              type={passwordShown ? 'text' : 'password'}
              autoComplete="new-password"
              endAction={
                <FieldActionWrapper
                  onClick={(e) => {
                    e.stopPropagation();
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
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <PasswordInput
              error={
                errors.confirmPassword
                  ? formatMessage({
                      id: errors.confirmPassword,
                      defaultMessage: errors.confirmPassword,
                    })
                  : ''
              }
              onChange={onChange}
              value={values.confirmPassword}
              label={formatMessage({
                id: 'Auth.form.confirmPassword.label',
                defaultMessage: 'Confirm Password',
              })}
              name="confirmPassword"
              type={passwordConfirmShown ? 'text' : 'password'}
              autoComplete="new-password"
              endAction={
                <FieldActionWrapper
                  onClick={(e) => {
                    e.stopPropagation();
                    setPasswordConfirmShown((prev) => !prev);
                  }}
                  label={formatMessage(
                    passwordConfirmShown
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
                  {passwordConfirmShown ? <Eye /> : <EyeStriked />}
                </FieldActionWrapper>
              }
            />
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

// Wrapper of the Eye Icon able to show or hide the Password inside the field
const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: ${pxToRem(16)};
    width: ${pxToRem(16)};
    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

/* -------------------------------------------------------------------------------------------------
 * PreferencesSection
 * -----------------------------------------------------------------------------------------------*/

interface PreferencesSectionProps extends Pick<GenericInputProps, 'onChange'> {
  values: {
    preferedLanguage?: string;
    currentTheme?: string;
  };
  localeNames: Record<string, string>;
}

const PreferencesSection = ({ onChange, values, localeNames }: PreferencesSectionProps) => {
  const { formatMessage } = useIntl();
  const themesToDisplay = useTypedSelector((state) => state.admin_app.theme.availableThemes);

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="delta" as="h2">
            {formatMessage({
              id: 'Settings.profile.form.section.experience.title',
              defaultMessage: 'Experience',
            })}
          </Typography>
          <Typography>
            {formatMessage(
              {
                id: 'Settings.profile.form.section.experience.interfaceLanguageHelp',
                defaultMessage:
                  'Preference changes will apply only to you. More information is available {here}.',
              },
              {
                here: (
                  <Box
                    as="a"
                    color="primary600"
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#locales"
                  >
                    {formatMessage({
                      id: 'Settings.profile.form.section.experience.here',
                      defaultMessage: 'here',
                    })}
                  </Box>
                ),
              }
            )}
          </Typography>
        </Flex>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <SingleSelect
              label={formatMessage({
                id: 'Settings.profile.form.section.experience.interfaceLanguage',
                defaultMessage: 'Interface language',
              })}
              placeholder={formatMessage({
                id: 'global.select',
                defaultMessage: 'Select',
              })}
              hint={formatMessage({
                id: 'Settings.profile.form.section.experience.interfaceLanguage.hint',
                defaultMessage: 'This will only display your own interface in the chosen language.',
              })}
              onClear={() => {
                onChange({
                  target: { name: 'preferedLanguage', value: null },
                });
              }}
              clearLabel={formatMessage({
                id: 'Settings.profile.form.section.experience.clear.select',
                defaultMessage: 'Clear the interface language selected',
              })}
              value={values.preferedLanguage}
              onChange={(e) => {
                onChange({
                  target: { name: 'preferedLanguage', value: e },
                });
              }}
            >
              {Object.entries(localeNames).map(([language, langName]) => (
                <SingleSelectOption value={language} key={language}>
                  {langName}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </GridItem>
          <GridItem s={12} col={6}>
            <SingleSelect
              label={formatMessage({
                id: 'Settings.profile.form.section.experience.mode.label',
                defaultMessage: 'Interface mode',
              })}
              placeholder={formatMessage({
                id: 'components.Select.placeholder',
                defaultMessage: 'Select',
              })}
              hint={formatMessage({
                id: 'Settings.profile.form.section.experience.mode.hint',
                defaultMessage: 'Displays your interface in the chosen mode.',
              })}
              value={values.currentTheme}
              onChange={(e) => {
                onChange({
                  target: { name: 'currentTheme', value: e },
                });
              }}
            >
              <SingleSelectOption value="system">
                {formatMessage({
                  id: 'Settings.profile.form.section.experience.mode.option-system-label',
                  defaultMessage: 'Use system settings',
                })}
              </SingleSelectOption>
              {themesToDisplay.map((theme) => (
                <SingleSelectOption value={theme} key={theme}>
                  {formatMessage(
                    {
                      id: 'Settings.profile.form.section.experience.mode.option-label',
                      defaultMessage: '{name} mode',
                    },
                    {
                      name: formatMessage({
                        id: theme,
                        defaultMessage: upperFirst(theme),
                      }),
                    }
                  )}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UserInfoSection
 * -----------------------------------------------------------------------------------------------*/

interface UserInfoSectionProps extends Pick<GenericInputProps, 'onChange'> {
  errors: { firstname?: string; lastname?: string; username?: string; email?: string };
  values: {
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
  };
}

const UserInfoSection = ({ errors, onChange, values }: UserInfoSectionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: 'global.profile',
            defaultMessage: 'Profile',
          })}
        </Typography>
        <Grid gap={5}>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{
                id: 'Auth.form.firstname.label',
                defaultMessage: 'First name',
              }}
              error={errors.firstname}
              onChange={onChange}
              value={values.firstname}
              type="text"
              name="firstname"
              required
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{
                id: 'Auth.form.lastname.label',
                defaultMessage: 'Last name',
              }}
              error={errors.lastname}
              onChange={onChange}
              value={values.lastname}
              type="text"
              name="lastname"
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{ id: 'Auth.form.email.label', defaultMessage: 'Email' }}
              error={errors.email}
              onChange={onChange}
              value={values.email}
              type="email"
              name="email"
              required
            />
          </GridItem>
          <GridItem s={12} col={6}>
            <GenericInput
              intlLabel={{
                id: 'Auth.form.username.label',
                defaultMessage: 'Username',
              }}
              error={errors.username}
              onChange={onChange}
              value={values.username}
              type="text"
              name="username"
            />
          </GridItem>
        </Grid>
      </Flex>
    </Box>
  );
};

export { ProfilePage };
