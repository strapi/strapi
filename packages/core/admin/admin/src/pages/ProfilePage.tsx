import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  FieldAction,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Typography,
  useNotifyAT,
} from '@strapi/design-system';
import {
  auth,
  Form,
  GenericInput,
  LoadingIndicatorPage,
  pxToRem,
  useAppInfo,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import { Check, Eye, EyeStriked } from '@strapi/icons';
import { Formik, FormikErrors } from 'formik';
import upperFirst from 'lodash/upperFirst';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import styled, { DefaultTheme } from 'styled-components';
import * as yup from 'yup';

import { useLocales } from '../components/LanguageProvider';
import { ThemeName } from '../contexts/themeToggle';
import { useThemeToggle } from '../hooks/useThemeToggle';
import { getFullName } from '../utils/getFullName';

import { schema as profileSchema } from './SettingsPage/pages/Users/utils/validations/users/profile';

const schema = yup.object().shape(profileSchema);

interface PseudoEvent {
  target: { value: unknown; name: string };
}

interface UserInfoProps {
  errors: FormikErrors<{
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
  }>;
  onChange: ({ target: { value } }: PseudoEvent) => void;
  values: {
    firstname?: string;
    lastname?: string;
    username?: string;
    email?: string;
  };
}

const UserInfo = ({
  errors = {},
  onChange = () => {},
  values = { firstname: '', lastname: '', username: '', email: '' },
}: UserInfoProps) => {
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

interface PasswordProps {
  errors: FormikErrors<{
    currentPassword: any;
    password: any;
    confirmPassword: any;
  }>;
  onChange: (event: React.ChangeEvent<any>) => void;
  values: {
    email: any;
    firstname: any;
    lastname: any;
    username: any;
    preferedLanguage: any;
    currentTheme: ThemeName | undefined;
  };
}

const Password = ({ errors, onChange, values }: PasswordProps) => {
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
                defaultMessage: 'Password confirmation',
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

interface PreferencesProps {
  allApplicationThemes: {
    dark?: ThemeName;
    light?: ThemeName;
  };
  onChange: ({ target: { value } }: PseudoEvent) => void;
  values?: {
    preferedLanguage?: string;
    currentTheme?: string;
  };
  localeNames?: {
    [key: string]: string;
  };
}

const Preferences = ({
  onChange = () => {},
  values = { currentTheme: '', preferedLanguage: undefined },
  localeNames = {},
  allApplicationThemes = {},
}: PreferencesProps) => {
  const { formatMessage } = useIntl();
  const themesToDisplay = Object.keys(allApplicationThemes).filter(
    (themeName) => allApplicationThemes[themeName]
  );

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

export const ProfilePage = () => {
  const { changeLocale, localeNames } = useLocales();
  const { setUserDisplayName } = useAppInfo();
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { notifyStatus } = useNotifyAT();
  const { currentTheme, themes: allApplicationThemes, onChangeTheme } = useThemeToggle();
  const { get, put } = useFetchClient();

  useFocusWhenNavigate();

  const { isLoading: isLoadingUser, data } = useQuery(
    'user',
    async () => {
      const { data } = await get('/admin/users/me');

      return data.data;
    },
    {
      onSuccess() {
        notifyStatus(
          formatMessage({
            id: 'Settings.profile.form.notify.data.loaded',
            defaultMessage: 'Your profile data has been loaded',
          })
        );
      },
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const { isLoading: isLoadingSSO, data: dataSSO } = useQuery(
    ['providers', 'isSSOLocked'],
    async () => {
      const {
        data: { data },
      } = await get('/admin/providers/isSSOLocked');

      return data;
    },
    {
      enabled: window.strapi.isEE && window.strapi.features.isEnabled('sso'),
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'Settings.permissions.users.sso.provider.error' },
        });
      },
    }
  );

  const isLoading = isLoadingUser || isLoadingSSO;

  const submitMutation = useMutation(
    async (body) => {
      const { confirmPassword, currentTheme, ...dataToSend } = body;
      const { data } = await put('/admin/users/me', dataToSend);

      return { ...data.data, currentTheme: body.currentTheme };
    },
    {
      async onSuccess(data) {
        await queryClient.invalidateQueries('user');
        const { email, firstname, lastname, username, preferedLanguage } = data;
        auth.setUserInfo({ email, firstname, lastname, username, preferedLanguage });
        const userDisplayName = data.username || getFullName(data.firstname, data.lastname);
        setUserDisplayName(userDisplayName);
        changeLocale(data.preferedLanguage);
        onChangeTheme(data.currentTheme);
        trackUsage('didChangeMode', { newMode: data.currentTheme });

        toggleNotification({
          type: 'success',
          message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
        });
      },
      onSettled() {
        unlockApp();
      },
      refetchActive: true,
    }
  );

  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = async (body, { setErrors }) => {
    lockApp();

    const username = body.username || null;
    submitMutation.mutate(
      { ...body, username },
      {
        onError(error) {
          const res = error?.response?.data;

          if (res?.data) {
            return setErrors(res.data);
          }

          return toggleNotification({
            type: 'warning',
            message: { id: 'notification.error', defaultMessage: 'An error occured' },
          });
        },
      }
    );
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
  const { email, firstname, lastname, username, preferedLanguage } = data;
  const initialData = {
    email,
    firstname,
    lastname,
    username,
    preferedLanguage,
    currentTheme,
    confirmPassword,
    currentPassword,
    password,
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
        validationSchema={schema}
        enableReinitialize
      >
        {({ errors, values, handleChange, isSubmitting, dirty }) => {
          return (
            <Form>
              <HeaderLayout
                title={data.username || getFullName(data.firstname, data.lastname)}
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
                    <UserInfo errors={errors} onChange={handleChange} values={values} />
                    {!hasLockedRole && (
                      <Password errors={errors} onChange={handleChange} values={values} />
                    )}
                    <Preferences
                      allApplicationThemes={allApplicationThemes}
                      onChange={handleChange}
                      values={values}
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
