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
import { Main } from '@strapi/parts/Main';
import { H3 } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import { ContentLayout, HeaderLayout } from '@strapi/parts/Layout';
import { Button } from '@strapi/parts/Button';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Stack } from '@strapi/parts/Stack';
import { useNotifyAT } from '@strapi/parts/LiveRegions';
import { Select, Option } from '@strapi/parts/Select';
import { FieldAction } from '@strapi/parts/Field';
import { TextInput } from '@strapi/parts/TextInput';
import Show from '@strapi/icons/Show';
import Hide from '@strapi/icons/Hide';
import CheckIcon from '@strapi/icons/CheckIcon';
import useLocalesProvider from '../../components/LocalesProvider/useLocalesProvider';
import { fetchUser, putUser } from './utils/api';
import schema from './utils/schema';

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
      const userDisplayName = data.username || `${data.firstname} ${data.lastname}`;
      setUserDisplayName(userDisplayName);
      changeLocale(data.preferedLanguage);

      toggleNotification({
        type: 'success',
        message: { id: 'notification.success.saved', defaultMessage: 'Saved' },
      });

      unlockApp();
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
      unlockApp();
    },
    refetchActive: true,
  });

  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = async body => {
    lockApp();

    const username = body.username || null;
    await submitMutation.mutateAsync({ ...body, username });
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
                title={data.username || `${data.firstname} ${data.lastname}`}
                primaryAction={
                  <Button startIcon={<CheckIcon />} loading={isSubmitting} type="submit">
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
                        <H3 as="h2">
                          {formatMessage({
                            id: 'Settings.profile.form.section.profile.title',
                            defaultMessage: 'Profile',
                          })}
                        </H3>
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
                        <H3 as="h2">
                          {formatMessage({
                            id: 'Settings.profile.form.section.password.title',
                            defaultMessage: 'Change password',
                          })}
                        </H3>
                        <Grid gap={5}>
                          <GridItem s={12} col={6}>
                            <TextInput
                              error={
                                errors.password
                                  ? formatMessage({
                                      id: errors.password,
                                      defaultMessage: 'This value is required.',
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
                                  {passwordShown ? <Show /> : <Hide />}
                                </FieldActionWrapper>
                              }
                            />
                          </GridItem>
                          <GridItem s={12} col={6}>
                            <TextInput
                              error={
                                errors.password
                                  ? formatMessage({
                                      id: errors.password,
                                      defaultMessage: 'This value is required.',
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
                                  {passwordConfirmShown ? <Show /> : <Hide />}
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
                        <H3 as="h2">
                          {formatMessage({
                            id: 'Settings.profile.form.section.experience.title',
                            defaultMessage: 'Experience',
                          })}
                        </H3>
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
                              onClear={() =>
                                handleChange({ target: { name: 'preferedLanguage', value: null } })}
                              clearLabel={formatMessage({
                                id: 'Settings.profile.form.section.experience.clear.select',
                                defaultMessage: 'Clear the interface language selected',
                              })}
                              value={values.preferedLanguage}
                              onChange={e =>
                                handleChange({ target: { name: 'preferedLanguage', value: e } })}
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
