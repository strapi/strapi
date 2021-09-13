import React from 'react';
import {
  CustomContentLayout,
  Form,
  GenericInput,
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
import { HeaderLayout } from '@strapi/parts/Layout';
import { Button } from '@strapi/parts/Button';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { Stack } from '@strapi/parts/Stack';
import { Select, Option } from '@strapi/parts/Select';
import CheckIcon from '@strapi/icons/CheckIcon';
import useLocalesProvider from '../../components/LocalesProvider/useLocalesProvider';
import { fetchUser, putUser } from './utils/api';
import { schema, layout } from './utils';

const ProfilePage = () => {
  const { changeLocale, localeNames } = useLocalesProvider();
  const { setUserDisplayName } = useAppInfos();
  const queryClient = useQueryClient();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  useFocusWhenNavigate();

  const { status, data } = useQuery('user', () => fetchUser(), {
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
    submitMutation.mutate({ ...body, username });
  };

  const fieldsToPick = ['email', 'firstname', 'lastname', 'username', 'preferedLanguage'];

  const initialData = Object.keys(pick(data, fieldsToPick)).reduce((acc, current) => {
    acc[current] = data?.[current];

    return acc;
  }, {});

  if (isLoading) {
    return (
      <Main>
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
        <CustomContentLayout isLoading />
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
              <CustomContentLayout>
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
                        {layout[0].map(input => {
                          return (
                            <GridItem key={input.name} {...input.size}>
                              <GenericInput
                                {...input}
                                error={errors[input.name]}
                                onChange={handleChange}
                                value={values[input.name] || ''}
                              />
                            </GridItem>
                          );
                        })}
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
                        {layout[1].map(input => {
                          return (
                            <GridItem key={input.name} {...input.size}>
                              <GenericInput
                                {...input}
                                error={errors[input.name]}
                                onChange={handleChange}
                                value={values[input.name] || ''}
                              />
                            </GridItem>
                          );
                        })}
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
                      <Select
                        label={formatMessage({
                          id: 'Settings.profile.form.section.experience.interfaceLanguage',
                          defaultMessage: 'Interface language',
                        })}
                        placeholder={formatMessage({
                          id: 'Settings.profile.form.section.experience.placeholder',
                          defaultMessage: 'Select',
                        })}
                        hint={formatMessage({
                          id: 'Settings.profile.form.section.experience.interfaceLanguage.hint',
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
                    </Stack>
                  </Box>
                </Stack>
              </CustomContentLayout>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

export default ProfilePage;
