import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Form,
  GenericInput,
  LoadingIndicatorPage,
  useAppInfos,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  auth,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import { Helmet } from 'react-helmet';
import { Main } from '@strapi/design-system/Main';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import { ContentLayout, HeaderLayout } from '@strapi/design-system/Layout';
import { Button } from '@strapi/design-system/Button';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Stack } from '@strapi/design-system/Stack';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Select, Option } from '@strapi/design-system/Select';
import { FieldAction } from '@strapi/design-system/Field';
import { TextInput } from '@strapi/design-system/TextInput';
import Eye from '@strapi/icons/Eye';
import EyeStriked from '@strapi/icons/EyeStriked';
import Check from '@strapi/icons/Check';
import useLocalesProvider from '../../components/LocalesProvider/useLocalesProvider';
import { fetchUser, putUser } from './utils/api';
import schema from './utils/schema';
import { getFullName } from '../../utils';

const PasswordInput = styled(TextInput)`
  ::-ms-reveal {
    display: none;
  }
`;

const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 1rem;
    width: 1rem;
    path {
      fill: ${({ theme }) => theme.colors.neutral600};
    }
  }
`;

const ProfilePage = () => {
  const [passwordShown, setPasswordShown] = useState(false);
  const [passwordConfirmShown, setPasswordConfirmShown] = useState(false);
  const [currentPasswordShown, setCurrentPasswordShown] = useState(false);
  const { changeLocale, localeNames } = useLocalesProvider();
  const { setUserDisplayName } = useAppInfos();
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { notifyStatus } = useNotifyAT();
  useFocusWhenNavigate();

  const { status, data } = useQuery('user', () => fetchUser(), {
    onSuccess: () => {
      notifyStatus(
        formatMessage({
          id: 'Settings.profile.form.notify.data.loaded',
          defaultMessage: 'Your profile data has been loaded',
        })
      );
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });

  const isLoading = status !== 'success';

  const submitMutation = useMutation(body => putUser(omit(body, 'confirmPassword')), {
    onSuccess: async data => {
      await queryClient.invalidateQueries('user');

      auth.setUserInfo(data);
      const userDisplayName = data.username || getFullName(data.firstname, data.lastname);
      setUserDisplayName(userDisplayName);
      changeLocale(data.preferedLanguage);

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });
    },
    onSettled: () => {
      unlockApp();
    },
    refetchActive: true,
  });

  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = async (body, { setErrors }) => {
    lockApp();

    const username = body.username || null;
    submitMutation.mutate(
      { ...body, username },
      {
        onError: error => {
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

  const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'preferedLanguage'];

  const initialData = pick(data, fieldsToPick);

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
        {({ errors, values, handleChange, isSubmitting }) => {
          return (
            <Form>
              <HeaderLayout
                title={data.username || getFullName(data.firstname, data.lastname)}
                primaryAction={
                  <Button startIcon={<Check />} loading={isSubmitting} type="submit">
                    {formatMessage({ id: 'form.button.save', defaultMessage: 'Save' })}
                  </Button>
                }
              />
              <Box paddingBottom={10}>
                <ContentLayout>
                  <Stack size={6}>
                    <Box
                      background="neutral0"
                      hasRadius
                      shadow="filterShadow"
                      paddingTop={6}
                      paddingBottom={6}
                      paddingLeft={7}
                      paddingRight={7}
                    >
                      <Stack size={4}>
                        <Typography variant="delta" as="h2">
                          {formatMessage({
                            id: 'Settings.profile.form.section.profile.title',
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
                              onChange={handleChange}
                              value={values.firstname || ''}
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
                              onChange={handleChange}
                              value={values.lastname || ''}
                              type="text"
                              name="lastname"
                            />
                          </GridItem>
                          <GridItem s={12} col={6}>
                            <GenericInput
                              intlLabel={{ id: 'Auth.form.email.label', defaultMessage: 'Email' }}
                              error={errors.email}
                              onChange={handleChange}
                              value={values.email || ''}
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
                              onChange={handleChange}
                              value={values.username || ''}
                              type="text"
                              name="username"
                            />
                          </GridItem>
                        </Grid>
                      </Stack>
                    </Box>
                    <Box
                      background="neutral0"
                      hasRadius
                      shadow="filterShadow"
                      paddingTop={6}
                      paddingBottom={6}
                      paddingLeft={7}
                      paddingRight={7}
                    >
                      <Stack size={4}>
                        <Typography variant="delta" as="h2">
                          {formatMessage({
                            id: 'Settings.profile.form.section.password.title',
                            defaultMessage: 'Change password',
                          })}
                        </Typography>

                        <Grid gap={5}>
                          <GridItem s={12} col={6}>
                            <PasswordInput
                              error={
                                errors.currentPassword
                                  ? formatMessage({
                                      id: errors.currentPassword,
                                      defaultMessage: errors.currentPassword,
                                    })
                                  : ''
                              }
                              onChange={handleChange}
                              value={values.currentPassword || ''}
                              label={formatMessage({
                                id: 'Auth.form.currentPassword.label',
                                defaultMessage: 'Current Password',
                              })}
                              name="currentPassword"
                              type={currentPasswordShown ? 'text' : 'password'}
                              endAction={
                                <FieldActionWrapper
                                  onClick={e => {
                                    e.stopPropagation();
                                    setCurrentPasswordShown(prev => !prev);
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
                              onChange={handleChange}
                              value={values.password || ''}
                              label={formatMessage({
                                id: 'Auth.form.password.label',
                                defaultMessage: 'Password',
                              })}
                              name="password"
                              type={passwordShown ? 'text' : 'password'}
                              endAction={
                                <FieldActionWrapper
                                  onClick={e => {
                                    e.stopPropagation();
                                    setPasswordShown(prev => !prev);
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
                              onChange={handleChange}
                              value={values.confirmPassword || ''}
                              label={formatMessage({
                                id: 'Auth.form.confirmPassword.label',
                                defaultMessage: 'Password confirmation',
                              })}
                              name="confirmPassword"
                              type={passwordConfirmShown ? 'text' : 'password'}
                              endAction={
                                <FieldActionWrapper
                                  onClick={e => {
                                    e.stopPropagation();
                                    setPasswordConfirmShown(prev => !prev);
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
                      </Stack>
                    </Box>
                    <Box
                      background="neutral0"
                      hasRadius
                      shadow="filterShadow"
                      paddingTop={6}
                      paddingBottom={6}
                      paddingLeft={7}
                      paddingRight={7}
                    >
                      <Stack size={4}>
                        <Stack size={1}>
                          <Typography variant="delta" as="h2">
                            {formatMessage({
                              id: 'Settings.profile.form.section.experience.title',
                              defaultMessage: 'Experience',
                            })}
                          </Typography>
                          <Typography>
                            {formatMessage(
                              {
                                id:
                                  'Settings.profile.form.section.experience.interfaceLanguageHelp',
                                defaultMessage:
                                  'Selection will change the interface language only for you. Please refer to this {documentation} to make other languages available for your team.',
                              },
                              {
                                documentation: (
                                  <a
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    href="https://docs.strapi.io/developer-docs/latest/development/admin-customization.html#locales"
                                  >
                                    {formatMessage({
                                      id: 'Settings.profile.form.section.experience.documentation',
                                      defaultMessage: 'documentation',
                                    })}
                                  </a>
                                ),
                              }
                            )}
                          </Typography>
                        </Stack>
                        <Grid gap={5}>
                          <GridItem s={12} col={6}>
                            <Select
                              label={formatMessage({
                                id: 'Settings.profile.form.section.experience.interfaceLanguage',
                                defaultMessage: 'Interface language',
                              })}
                              placeholder={formatMessage({
                                id: 'components.Select.placeholder',
                                defaultMessage: 'Select',
                              })}
                              hint={formatMessage({
                                id:
                                  'Settings.profile.form.section.experience.interfaceLanguage.hint',
                                defaultMessage:
                                  'This will only display your own interface in the chosen language.',
                              })}
                              onClear={() => {
                                handleChange({
                                  target: { name: 'preferedLanguage', value: null },
                                });
                              }}
                              clearLabel={formatMessage({
                                id: 'Settings.profile.form.section.experience.clear.select',
                                defaultMessage: 'Clear the interface language selected',
                              })}
                              value={values.preferedLanguage}
                              onChange={e => {
                                handleChange({
                                  target: { name: 'preferedLanguage', value: e },
                                });
                              }}
                            >
                              {Object.keys(localeNames).map(language => {
                                const langName = localeNames[language];

                                return (
                                  <Option value={language} key={language}>
                                    {langName}
                                  </Option>
                                );
                              })}
                            </Select>
                          </GridItem>
                        </Grid>
                      </Stack>
                    </Box>
                  </Stack>
                </ContentLayout>
              </Box>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

export default ProfilePage;
