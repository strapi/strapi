/**
 *
 * EditView
 *
 */

import {
  Form,
  LoadingIndicatorPage,
  request,
  to,
  useNotification,
  useOverlayBlocker,
  SettingsPageTitle,
} from '@strapi/helper-plugin';
import { BackIcon, CheckIcon, Publish } from '@strapi/icons';
import {
  Box,
  Button,
  ContentLayout,
  Grid,
  GridItem,
  HeaderLayout,
  Link,
  Main,
  Stack,
  TextInput,
} from '@strapi/parts';
import { Field, Formik } from 'formik';
import React, { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useHistory, useRouteMatch } from 'react-router-dom';
import EventInput from '../../../components/Webhooks/EventInput';
import TriggerContainer from '../../../components/Webhooks/TriggerContainer';
import HeadersInput from '../../../components/Webhooks/HeadersInput';
import { useModels } from '../../../hooks';
import { cleanData, schema } from './utils';

const EditView = () => {
  const {
    params: { id },
  } = useRouteMatch('/settings/webhooks/:id');
  const { formatMessage } = useIntl();
  const { replace } = useHistory();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();
  const { isLoading: isLoadingForModels, collectionTypes } = useModels();

  const isCreating = id === 'create';

  const fetchWebhook = useCallback(
    async id => {
      const [err, { data }] = await to(
        request(`/admin/webhooks/${id}`, {
          method: 'GET',
        })
      );

      if (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });

        return null;
      }

      return data;
    },
    [toggleNotification]
  );

  const triggerWebhookFn = useCallback(
    async id => {
      const [err, { data }] = await to(
        request(`/admin/webhooks/${id}/trigger`, {
          method: 'POST',
        })
      );

      if (err && err?.code !== 20) {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }

      return data;
    },
    [toggleNotification]
  );

  const { isLoading, data } = useQuery(['get-webhook', id], () => fetchWebhook(id), {
    enabled: !isCreating,
  });

  const {
    isLoading: isTriggering,
    data: triggerResponse,
    refetch: triggerWebhook,
    isIdle: isTriggerIdle,
  } = useQuery(['trigger-webhook', id], () => triggerWebhookFn(id), { enabled: false });

  const createWebhookMutation = useMutation(body =>
    request('/admin/webhooks', {
      method: 'POST',
      body,
    })
  );

  const updateWebhookMutation = useMutation(({ id, body }) =>
    request(`/admin/webhooks/${id}`, {
      method: 'PUT',
      body,
    })
  );

  const handleSubmit = async data => {
    if (isCreating) {
      lockApp();
      createWebhookMutation.mutate(cleanData(data), {
        onSuccess: result => {
          toggleNotification({
            type: 'success',
            message: { id: 'Settings.webhooks.created' },
          });
          replace(`/settings/webhooks/${result.data.id}`);
          unlockApp();
        },
        onError: e => {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
          console.log(e);
          unlockApp();
        },
      });
    } else {
      lockApp();
      updateWebhookMutation.mutate(
        { id, body: cleanData(data) },
        {
          onSuccess: () => {
            queryClient.invalidateQueries(['get-webhook', id]);
            toggleNotification({
              type: 'success',
              message: { id: 'notification.form.success.fields' },
            });
            unlockApp();
          },
          onError: e => {
            toggleNotification({
              type: 'warning',
              message: { id: 'notification.error' },
            });
            console.log(e);
            unlockApp();
          },
        }
      );
    }
  };

  const isDraftAndPublishEvents = useMemo(
    () => collectionTypes.some(ct => ct.options.draftAndPublish === true),
    [collectionTypes]
  );

  if (isLoading || isLoadingForModels) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main labelledBy="title">
      <SettingsPageTitle name="Webhooks" />
      <Formik
        onSubmit={handleSubmit}
        initialValues={{
          name: data?.name || '',
          url: data?.url || '',
          headers: Object.keys(data?.headers || []).length
            ? Object.entries(data.headers).map(([key, value]) => ({ key, value }))
            : [{ key: '', value: '' }],
          events: data?.events || [],
        }}
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur={false}
      >
        {({ handleSubmit, errors, handleReset }) => (
          <Form noValidate>
            <HeaderLayout
              id="title"
              primaryAction={
                <Stack horizontal size={2}>
                  <Button
                    onClick={triggerWebhook}
                    variant="tertiary"
                    startIcon={<Publish />}
                    disabled={isCreating || isTriggering}
                  >
                    {formatMessage({
                      id: 'Settings.webhooks.trigger',
                      defaultMessage: 'Trigger',
                    })}
                  </Button>
                  <Button variant="secondary" onClick={handleReset}>
                    {formatMessage({
                      id: 'app.components.Button.reset',
                      defaultMessage: 'Reset',
                    })}
                  </Button>
                  <Button startIcon={<CheckIcon />} onClick={handleSubmit}>
                    {formatMessage({
                      id: 'app.components.Button.save',
                      defaultMessage: 'Save',
                    })}
                  </Button>
                </Stack>
              }
              title={
                isCreating
                  ? formatMessage({
                      id: 'Settings.webhooks.create',
                      defaultMessage: 'Create a webhook',
                    })
                  : data?.name
              }
              navigationAction={
                <Link startIcon={<BackIcon />} to="/settings/webhooks">
                  Go back
                </Link>
              }
              as="h1"
            />
            <ContentLayout>
              {(isTriggering || !isTriggerIdle) && (
                <div className="trigger-wrapper">
                  <TriggerContainer
                    isPending={isTriggering}
                    response={triggerResponse}
                    onCancel={() => {}}
                  />
                </div>
              )}
              <Box background="neutral0" padding={8} shadow="filterShadow" hasRadius>
                <Stack size={6}>
                  <Grid gap={6}>
                    <GridItem col={6}>
                      <Field
                        as={TextInput}
                        name="name"
                        error={errors.name && formatMessage({ id: errors.name })}
                        label={formatMessage({
                          id: 'Settings.webhooks.form.name',
                          defaultMessage: 'Name',
                        })}
                      />
                    </GridItem>
                    <GridItem col={12}>
                      <Field
                        as={TextInput}
                        name="url"
                        error={errors.url && formatMessage({ id: errors.url })}
                        label={formatMessage({
                          id: 'Settings.roles.form.input.url',
                          defaultMessage: 'Url',
                        })}
                      />
                    </GridItem>
                  </Grid>
                  <HeadersInput />
                  <EventInput isDraftAndPublish={isDraftAndPublishEvents} />
                </Stack>
              </Box>
            </ContentLayout>
          </Form>
        )}
      </Formik>
    </Main>
  );
};

export default EditView;
