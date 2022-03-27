import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import {
  CheckPagePermissions,
  Form,
  GenericInput,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
} from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { Main } from '@strapi/design-system/Main';
import { HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { Button } from '@strapi/design-system/Button';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Select, Option } from '@strapi/design-system/Select';
import { Typography } from '@strapi/design-system/Typography';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import Check from '@strapi/icons/Check';
import pluginPermissions from '../../permissions';
import { getTrad } from '../../utils';
import layout from './utils/layout';
import schema from './utils/schema';
import { fetchData, putAdvancedSettings } from './utils/api';

const ProtectedAdvancedSettingsPage = () => (
  <CheckPagePermissions permissions={pluginPermissions.readAdvancedSettings}>
    <AdvancedSettingsPage />
  </CheckPagePermissions>
);

const AdvancedSettingsPage = () => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { notifyStatus } = useNotifyAT();
  const queryClient = useQueryClient();
  useFocusWhenNavigate();

  const updatePermissions = useMemo(
    () => ({ update: pluginPermissions.updateAdvancedSettings }),
    []
  );
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(updatePermissions);

  const { status: isLoadingData, data } = useQuery('advanced', () => fetchData(), {
    onSuccess: () => {
      notifyStatus(
        formatMessage({
          id: getTrad('Form.advancedSettings.data.loaded'),
          defaultMessage: 'Advanced settings data has been loaded',
        })
      );
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: getTrad('notification.error'), defaultMessage: 'An error occurred' },
      });
    },
  });

  const isLoading = isLoadingForPermissions || isLoadingData !== 'success';

  const submitMutation = useMutation(body => putAdvancedSettings(body), {
    onSuccess: async () => {
      await queryClient.invalidateQueries('advanced');
      toggleNotification({
        type: 'success',
        message: { id: getTrad('notification.success.saved'), defaultMessage: 'Saved' },
      });

      unlockApp();
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: getTrad('notification.error'), defaultMessage: 'An error occurred' },
      });
      unlockApp();
    },
    refetchActive: true,
  });

  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = async body => {
    lockApp();

    const urlConfirmation = body.email_confirmation ? body.email_confirmation_redirection : '';

    await submitMutation.mutateAsync({ ...body, email_confirmation_redirection: urlConfirmation });
  };

  if (isLoading) {
    return (
      <Main aria-busy="true">
        <SettingsPageTitle
          name={formatMessage({
            id: getTrad('HeaderNav.link.advancedSettings'),
            defaultMessage: 'Advanced Settings',
          })}
        />
        <HeaderLayout
          title={formatMessage({
            id: getTrad('HeaderNav.link.advancedSettings'),
            defaultMessage: 'Advanced Settings',
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
      <SettingsPageTitle
        name={formatMessage({
          id: getTrad('HeaderNav.link.advancedSettings'),
          defaultMessage: 'Advanced Settings',
        })}
      />
      <Formik
        onSubmit={handleSubmit}
        initialValues={data.settings}
        validateOnChange={false}
        validationSchema={schema}
        enableReinitialize
      >
        {({ errors, values, handleChange, isSubmitting }) => {
          return (
            <Form>
              <HeaderLayout
                title={formatMessage({
                  id: getTrad('HeaderNav.link.advancedSettings'),
                  defaultMessage: 'Advanced Settings',
                })}
                primaryAction={
                  <Button
                    loading={isSubmitting}
                    type="submit"
                    disabled={!canUpdate}
                    startIcon={<Check />}
                    size="L"
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                }
              />
              <ContentLayout>
                <Box
                  background="neutral0"
                  hasRadius
                  shadow="filterShadow"
                  paddingTop={6}
                  paddingBottom={6}
                  paddingLeft={7}
                  paddingRight={7}
                >
                  <Stack spacing={4}>
                    <Typography variant="delta" as="h2">
                      {formatMessage({
                        id: 'global.settings',
                        defaultMessage: 'Settings',
                      })}
                    </Typography>
                    <Grid gap={6}>
                      <GridItem col={6} s={12}>
                        <Select
                          label={formatMessage({
                            id: getTrad('EditForm.inputSelect.label.role'),
                            defaultMessage: 'Default role for authenticated users',
                          })}
                          value={values.default_role}
                          hint={formatMessage({
                            id: getTrad('EditForm.inputSelect.description.role'),
                            defaultMessage:
                              'It will attach the new authenticated user to the selected role.',
                          })}
                          onChange={e =>
                            handleChange({ target: { name: 'default_role', value: e } })}
                        >
                          {data.roles.map(role => {
                            return (
                              <Option key={role.type} value={role.type}>
                                {role.name}
                              </Option>
                            );
                          })}
                        </Select>
                      </GridItem>
                      {layout.map(input => {
                        let value = values[input.name];

                        if (!value) {
                          value = input.type === 'bool' ? false : '';
                        }

                        return (
                          <GridItem key={input.name} {...input.size}>
                            <GenericInput
                              {...input}
                              value={value}
                              error={errors[input.name]}
                              disabled={
                                input.name === 'email_confirmation_redirection' &&
                                values.email_confirmation === false
                              }
                              onChange={handleChange}
                            />
                          </GridItem>
                        );
                      })}
                    </Grid>
                  </Stack>
                </Box>
              </ContentLayout>
            </Form>
          );
        }}
      </Formik>
    </Main>
  );
};

export default ProtectedAdvancedSettingsPage;
