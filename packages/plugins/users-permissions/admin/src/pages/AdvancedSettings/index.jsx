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
  Typography,
  useNotifyAT,
} from '@strapi/design-system';
import {
  useAPIErrorHandler,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
  useRBAC,
} from '@strapi/helper-plugin';
import { Check } from '@strapi/icons';
import { Page, Form, InputRenderer } from '@strapi/strapi/admin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { PERMISSIONS } from '../../constants';
import { getTrad } from '../../utils';

import layout from './utils/layout';
import schema from './utils/schema';

const ProtectedAdvancedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.readAdvancedSettings}>
    <AdvancedSettingsPage />
  </Page.Protect>
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
    return <Page.Loading />;
  }

  return (
    <Main aria-busy={isSubmittingForm}>
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: formatMessage({
              id: getTrad('HeaderNav.link.advancedSettings'),
              defaultMessage: 'Advanced Settings',
            }),
          }
        )}
      />
      <Form onSubmit={handleSubmit} initialValues={data.settings} validationSchema={schema}>
        {({ values, isSubmitting, modified }) => {
          return (
            <>
              <HeaderLayout
                title={formatMessage({
                  id: getTrad('HeaderNav.link.advancedSettings'),
                  defaultMessage: 'Advanced Settings',
                })}
                primaryAction={
                  <Button
                    loading={isSubmitting}
                    type="submit"
                    disabled={!modified || !canUpdate}
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
                      {[
                        {
                          label: {
                            id: getTrad('EditForm.inputSelect.label.role'),
                            defaultMessage: 'Default role for authenticated users',
                          },
                          hint: {
                            id: getTrad('EditForm.inputSelect.description.role'),
                            defaultMessage:
                              'It will attach the new authenticated user to the selected role.',
                          },
                          options: data.roles.map((role) => ({
                            label: role.name,
                            value: role.type,
                          })),
                          name: 'default_role',
                          size: 6,
                          type: 'enumeration',
                        },
                        ...layout,
                      ].map(({ size, ...field }) => (
                        <GridItem key={field.name} col={size}>
                          <InputRenderer
                            {...field}
                            disabled={
                              field.name === 'email_confirmation_redirection' &&
                              values.email_confirmation === false
                            }
                            label={formatMessage(field.label)}
                            hint={field.hint ? formatMessage(field.hint) : undefined}
                            placeholder={
                              field.placeholder ? formatMessage(field.placeholder) : undefined
                            }
                          />
                        </GridItem>
                      ))}
                    </Grid>
                  </Flex>
                </Box>
              </ContentLayout>
            </>
          );
        }}
      </Form>
    </Main>
  );
};

export { ProtectedAdvancedSettingsPage, AdvancedSettingsPage };
