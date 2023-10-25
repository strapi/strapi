import React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  HeaderLayout,
  Main,
  useNotifyAT,
} from '@strapi/design-system';
import {
  auth,
  Form,
  LoadingIndicatorPage,
  useAppInfo,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useTracking,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Formik } from 'formik';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { useLocales } from '../../components/LanguageProvider';
import { useThemeToggle } from '../../hooks/useThemeToggle';
import { getFullName } from '../../utils/getFullName';

import Password from './components/Password';
import Preferences from './components/Preferences';
import UserInfo from './components/UserInfo';
import schema from './utils/schema';

const ProfilePage = () => {
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
  const initialData = { email, firstname, lastname, username, preferedLanguage, currentTheme };

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

export default ProfilePage;
