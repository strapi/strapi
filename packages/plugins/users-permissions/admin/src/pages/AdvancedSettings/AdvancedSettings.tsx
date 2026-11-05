import * as React from 'react';

import { Box, Button, Flex, Grid, Typography, useNotifyAT } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import {
  useAPIErrorHandler,
  Page,
  Form,
  InputRenderer,
  useNotification,
  useFetchClient,
  useRBAC,
  Layouts,
} from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';

import { PERMISSIONS } from '../../constants';
import { getTrad } from '../../utils/getTrad';

import { layout } from './utils/layout';
import { schema } from './utils/schema';

import type { AdvancedSettings, AdvancedSettingsResponse } from '../../types';

/** Requires advanced-settings read access before rendering the settings form. */
const ProtectedAdvancedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.readAdvancedSettings}>
    <AdvancedSettingsPage />
  </Page.Protect>
);

/** Edits registration and email-confirmation settings. */
const AdvancedSettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { notifyStatus } = useNotifyAT();
  const queryClient = useQueryClient();
  const { get, put } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.updateAdvancedSettings });

  const { isLoading: isLoadingData, data } = useQuery(
    ['users-permissions', 'advanced'],
    async () => {
      const { data } = await get<AdvancedSettingsResponse>('/users-permissions/advanced');

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
          type: 'danger',
          message: formatMessage({
            id: getTrad('notification.error'),
            defaultMessage: 'An error occurred',
          }),
        });
      },
    }
  );

  const isLoading = isLoadingForPermissions || isLoadingData;

  const submitMutation = useMutation(
    (body: AdvancedSettings) => put('/users-permissions/advanced', body),
    {
      async onSuccess() {
        await queryClient.invalidateQueries(['users-permissions', 'advanced']);

        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: getTrad('notification.success.saved'),
            defaultMessage: 'Saved',
          }),
        });
      },
      onError(error: Error) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(error),
        });
      },
    }
  );

  const { isLoading: isSubmittingForm } = submitMutation;

  const handleSubmit = async (body: AdvancedSettings) => {
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

  if (data === undefined) {
    return <Page.Error />;
  }

  return (
    <Page.Main aria-busy={isSubmittingForm}>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: formatMessage({
              id: getTrad('HeaderNav.link.advancedSettings'),
              defaultMessage: 'Advanced Settings',
            }),
          }
        )}
      </Page.Title>
      <Form<AdvancedSettings>
        method="PUT"
        onSubmit={handleSubmit}
        initialValues={data.settings}
        validationSchema={schema}
      >
        {({ values, isSubmitting, modified }) => {
          return (
            <>
              <Layouts.Header
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
                    fullWidth
                  >
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                }
              />
              <Layouts.Content>
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
                        id: 'global.settings',
                        defaultMessage: 'Settings',
                      })}
                    </Typography>
                    <Grid.Root gap={6}>
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
                          type: 'enumeration' as const,
                          placeholder: undefined,
                        },
                        ...layout,
                      ].map(({ size, ...field }) => (
                        <Grid.Item
                          key={field.name}
                          col={size}
                          direction="column"
                          alignItems="stretch"
                        >
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
                        </Grid.Item>
                      ))}
                    </Grid.Root>
                  </Flex>
                </Box>
              </Layouts.Content>
            </>
          );
        }}
      </Form>
    </Page.Main>
  );
};

export { ProtectedAdvancedSettingsPage, AdvancedSettingsPage };
