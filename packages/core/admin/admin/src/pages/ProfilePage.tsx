import * as React from 'react';

import { Box, Button, Flex, useNotifyAT, Grid, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import * as yup from 'yup';

import { Form, FormHelpers } from '../components/Form';
import { InputRenderer } from '../components/FormInputs/Renderer';
import { Layouts } from '../components/Layouts/Layout';
import { Page } from '../components/PageHelpers';
import { useTypedDispatch, useTypedSelector } from '../core/store/hooks';
import { useAuth } from '../features/Auth';
import { useNotification } from '../features/Notifications';
import { useTracking } from '../features/Tracking';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { AppState, setAppTheme } from '../reducer';
import { useIsSSOLockedQuery, useUpdateMeMutation } from '../services/auth';
import { isBaseQueryError } from '../utils/baseQuery';
import { translatedErrors } from '../utils/translatedErrors';
import { getDisplayName } from '../utils/users';

import { COMMON_USER_SCHEMA } from './Settings/pages/Users/utils/validation';

import type { UpdateMe } from '../../../shared/contracts/users';

const PROFILE_VALIDTION_SCHEMA = yup.object().shape({
  ...COMMON_USER_SCHEMA,
  currentPassword: yup
    .string()
    // @ts-expect-error – no idea why this is failing.
    .when(['password', 'confirmPassword'], (password, confirmPassword, passSchema) => {
      return password || confirmPassword
        ? passSchema
            .required({
              id: translatedErrors.required.id,
              defaultMessage: 'This field is required',
            })
            .nullable()
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
  const { toggleNotification } = useNotification();
  const { notifyStatus } = useNotifyAT();
  const currentTheme = useTypedSelector((state) => state.admin_app.theme.currentTheme);
  const dispatch = useTypedDispatch();
  const {
    _unstableFormatValidationErrors: formatValidationErrors,
    _unstableFormatAPIError: formatApiError,
  } = useAPIErrorHandler();

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
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
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
        type: 'danger',
        message: formatMessage({ id: 'Settings.permissions.users.sso.provider.error' }),
      });
    }
  }, [error, formatMessage, toggleNotification]);

  type UpdateUsersMeBody = UpdateMe.Request['body'] & {
    confirmPassword: string;
    currentTheme: AppState['theme']['currentTheme'];
  };

  const handleSubmit = async (
    body: UpdateUsersMeBody,
    { setErrors }: FormHelpers<UpdateUsersMeBody>
  ) => {
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
        message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
      });
    }

    if ('error' in res) {
      if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
        setErrors(formatValidationErrors(res.error));
      } else if (isBaseQueryError(res.error)) {
        toggleNotification({
          type: 'danger',
          message: formatApiError(res.error),
        });
      } else {
        toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
        });
      }
    }
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  const hasLockedRole = dataSSO?.isSSOLocked ?? false;
  const { email, firstname, lastname, username, preferedLanguage } = user ?? {};
  const initialData = {
    email: email ?? '',
    firstname: firstname ?? '',
    lastname: lastname ?? '',
    username: username ?? '',
    preferedLanguage,
    currentTheme,
    confirmPassword: '',
    password: '',
  };

  return (
    <Page.Main aria-busy={isSubmittingForm}>
      <Page.Title>
        {formatMessage({
          id: 'Settings.profile.form.section.head.title',
          defaultMessage: 'User profile',
        })}
      </Page.Title>
      <Form
        method="PUT"
        onSubmit={handleSubmit}
        initialValues={initialData}
        validationSchema={PROFILE_VALIDTION_SCHEMA}
      >
        {({ isSubmitting, modified }) => (
          <>
            <Layouts.Header
              title={getDisplayName(user)}
              primaryAction={
                <Button
                  startIcon={<Check />}
                  loading={isSubmitting}
                  type="submit"
                  disabled={!modified}
                >
                  {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                </Button>
              }
            />
            <Box paddingBottom={10}>
              <Layouts.Content>
                <Flex direction="column" alignItems="stretch" gap={6}>
                  <UserInfoSection />
                  {!hasLockedRole && <PasswordSection />}
                  <PreferencesSection localeNames={localeNames} />
                </Flex>
              </Layouts.Content>
            </Box>
          </>
        )}
      </Form>
    </Page.Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PasswordSection
 * -----------------------------------------------------------------------------------------------*/

const PasswordSection = () => {
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
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: 'global.change-password',
            defaultMessage: 'Change password',
          })}
        </Typography>
        {[
          [
            {
              label: formatMessage({
                id: 'Auth.form.currentPassword.label',
                defaultMessage: 'Current Password',
              }),
              name: 'currentPassword',
              size: 6,
              type: 'password' as const,
            },
          ],
          [
            {
              autoComplete: 'new-password',
              label: formatMessage({
                id: 'global.password',
                defaultMessage: 'Password',
              }),
              name: 'password',
              size: 6,
              type: 'password' as const,
            },
            {
              autoComplete: 'new-password',
              label: formatMessage({
                id: 'Auth.form.confirmPassword.label',
                defaultMessage: 'Confirm Password',
              }),
              name: 'confirmPassword',
              size: 6,
              type: 'password' as const,
            },
          ],
        ].map((row, index) => (
          <Grid.Root key={index} gap={5}>
            {row.map(({ size, ...field }) => (
              <Grid.Item key={field.name} col={size} direction="column" alignItems="stretch">
                <InputRenderer {...field} />
              </Grid.Item>
            ))}
          </Grid.Root>
        ))}
      </Flex>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PreferencesSection
 * -----------------------------------------------------------------------------------------------*/

interface PreferencesSectionProps {
  localeNames: Record<string, string>;
}

const PreferencesSection = ({ localeNames }: PreferencesSectionProps) => {
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
          <Typography variant="delta" tag="h2">
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
                    tag="a"
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
        <Grid.Root gap={5}>
          {[
            {
              hint: formatMessage({
                id: 'Settings.profile.form.section.experience.interfaceLanguage.hint',
                defaultMessage: 'This will only display your own interface in the chosen language.',
              }),
              label: formatMessage({
                id: 'Settings.profile.form.section.experience.interfaceLanguage',
                defaultMessage: 'Interface language',
              }),
              name: 'preferedLanguage',
              options: Object.entries(localeNames).map(([value, label]) => ({
                label,
                value,
              })),
              placeholder: formatMessage({
                id: 'global.select',
                defaultMessage: 'Select',
              }),
              size: 6,
              type: 'enumeration' as const,
            },
            {
              hint: formatMessage({
                id: 'Settings.profile.form.section.experience.mode.hint',
                defaultMessage: 'Displays your interface in the chosen mode.',
              }),
              label: formatMessage({
                id: 'Settings.profile.form.section.experience.mode.label',
                defaultMessage: 'Interface mode',
              }),
              name: 'currentTheme',
              options: [
                {
                  label: formatMessage({
                    id: 'Settings.profile.form.section.experience.mode.option-system-label',
                    defaultMessage: 'Use system settings',
                  }),
                  value: 'system',
                },
                ...themesToDisplay.map((theme) => ({
                  label: formatMessage(
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
                  ),
                  value: theme,
                })),
              ],
              placeholder: formatMessage({
                id: 'components.Select.placeholder',
                defaultMessage: 'Select',
              }),
              size: 6,
              type: 'enumeration' as const,
            },
          ].map(({ size, ...field }) => (
            <Grid.Item key={field.name} col={size} direction="column" alignItems="stretch">
              <InputRenderer {...field} />
            </Grid.Item>
          ))}
        </Grid.Root>
      </Flex>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * UserInfoSection
 * -----------------------------------------------------------------------------------------------*/

const UserInfoSection = () => {
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
        <Typography variant="delta" tag="h2">
          {formatMessage({
            id: 'global.profile',
            defaultMessage: 'Profile',
          })}
        </Typography>
        <Grid.Root gap={5}>
          {[
            {
              label: formatMessage({
                id: 'Auth.form.firstname.label',
                defaultMessage: 'First name',
              }),
              name: 'firstname',
              required: true,
              size: 6,
              type: 'string' as const,
            },
            {
              label: formatMessage({
                id: 'Auth.form.lastname.label',
                defaultMessage: 'Last name',
              }),
              name: 'lastname',
              size: 6,
              type: 'string' as const,
            },
            {
              label: formatMessage({
                id: 'Auth.form.email.label',
                defaultMessage: 'Email',
              }),
              name: 'email',
              required: true,
              size: 6,
              type: 'email' as const,
            },
            {
              label: formatMessage({
                id: 'Auth.form.username.label',
                defaultMessage: 'Username',
              }),
              name: 'username',
              size: 6,
              type: 'string' as const,
            },
          ].map(({ size, ...field }) => (
            <Grid.Item key={field.name} col={size} direction="column" alignItems="stretch">
              <InputRenderer {...field} />
            </Grid.Item>
          ))}
        </Grid.Root>
      </Flex>
    </Box>
  );
};

export { ProfilePage };
