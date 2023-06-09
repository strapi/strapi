import React from 'react';
import {
  Form,
  LoadingIndicatorPage,
  useAppInfo,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  auth,
  useTracking,
  useFetchClient,
} from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Helmet } from 'react-helmet';
import {
  Main,
  Box,
  ContentLayout,
  HeaderLayout,
  Button,
  Flex,
  useNotifyAT,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import UserInfo from './components/UserInfo';
import Preferences from './components/Preferences';
import Password from './components/Password';
import useLocalesProvider from '../../components/LocalesProvider/useLocalesProvider';
import { useThemeToggle } from '../../hooks';
import schema from './utils/schema';
import { getFullName } from '../../utils';

const ProfilePage = () => {
  const { changeLocale, localeNames } = useLocalesProvider();
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
      if (window.strapi.isEE) {
        const {
          data: { data },
        } = await get('/admin/providers/isSSOLocked');

        return data;
      }

      return {
        isSSOLocked: false,
      };
    },
    {
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

  const hasLockedRole = dataSSO?.isSSOLocked;
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
        {({ errors, values, handleChange, isSubmitting }) => {
          return (
            <Form>
              <HeaderLayout
                title={data.username || getFullName(data.firstname, data.lastname)}
                primaryAction={
                  <Button startIcon={<Check />} loading={isSubmitting} type="submit">
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
