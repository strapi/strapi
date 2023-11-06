import React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Main,
  Option,
  Select,
  Typography,
  useNotifyAT,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  Form,
  GenericInput,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { PERMISSIONS } from '../../constants';
import { getTrad } from '../../utils';

import layout from './utils/layout';
import schema from './utils/schema';

const ProtectedAdvancedSettingsPage = () => (
  <CheckPagePermissions permissions={PERMISSIONS.readAdvancedSettings}>
    <AdvancedSettingsPage />
  </CheckPagePermissions>
);

const AdvancedSettingsPage = () => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { notifyStatus } = useNotifyAT();
  const queryClient = useQueryClient();
  const { get, put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  useFocusWhenNavigate();

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.updateAdvancedSettings });

  const { isLoading: isLoadingData, data } = useQuery(
    ['users-permissions', 'advanced'],
    async () => {
      const { data } = await get('/users-permissions/advanced');

      return data;
    },
    {
      onSuccess() {
        notifyStatus(
          formatMessage({
            id: getTrad('Form.advancedSettings.data.loaded'),
            defaultMessage: 'Advanced settings data has been loaded',
          })
        );
      },
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: getTrad('notification.error'), defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const isLoading = isLoadingForPermissions || isLoadingData;

  const submitMutation = useMutation((body) => put('/users-permissions/advanced', body), {
    async onSuccess() {
      await queryClient.invalidateQueries(['users-permissions', 'advanced']);

      toggleNotification({
        type: 'success',
        message: { id: getTrad('notification.success.saved'), defaultMessage: 'Saved' },
      });

      unlockApp();
    },
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });

      unlockApp();
    },
    refetchActive: true,
  });

  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = async (body) => {
    lockApp();

    submitMutation.mutate({
      ...body,
      email_confirmation_redirection: body.email_confirmation
        ? body.email_confirmation_redirection
        : '',
    });
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
        {({ errors, values, handleChange, isSubmitting, dirty }) => {
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
                    disabled={canUpdate ? !dirty : !canUpdate}
                    startIcon={<Check />}
                    size="S"
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
                  <Flex direction="column" alignItems="stretch" gap={4}>
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
                          onChange={(e) =>
                            handleChange({ target: { name: 'default_role', value: e } })
                          }
                        >
                          {data.roles.map((role) => {
                            return (
                              <Option key={role.type} value={role.type}>
                                {role.name}
                              </Option>
                            );
                          })}
                        </Select>
                      </GridItem>
                      {layout.map((input) => {
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
                  </Flex>
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
