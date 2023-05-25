/**
 *
 * EditView
 *
 */
import * as React from 'react';
import {
  LoadingIndicatorPage,
  SettingsPageTitle,
  useNotification,
  useOverlayBlocker,
  useFetchClient,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useContentTypes } from '../../../../../hooks/useContentTypes';
import WebhookForm from './components/WebhookForm';
import cleanData from './utils/formatData';

const EditView = () => {
  const {
    params: { id },
  } = useRouteMatch('/settings/webhooks/:id');

  const { replace } = useHistory();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();
  const { isLoading: isLoadingForModels, collectionTypes } = useContentTypes();
  const { put, get, post } = useFetchClient();

  const isCreating = id === 'create';

  const { isLoading, data } = useQuery(
    ['get-webhook', id],
    async () => {
      try {
        const {
          data: { data },
        } = await get(`/admin/webhooks/${id}`);

        return data;
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });

        return null;
      }
    },
    {
      enabled: !isCreating,
    }
  );

  const {
    isLoading: isTriggering,
    data: triggerResponse,
    isIdle: isTriggerIdle,
    mutate,
  } = useMutation(() => post(`/admin/webhooks/${id}/trigger`));

  const triggerWebhook = () =>
    mutate(null, {
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
    });

  const createWebhookMutation = useMutation((body) => post('/admin/webhooks', body));

  const updateWebhookMutation = useMutation(({ id, body }) => put(`/admin/webhooks/${id}`, body));

  const handleSubmit = async (data) => {
    if (isCreating) {
      lockApp();
      createWebhookMutation.mutate(cleanData(data), {
        onSuccess({ data: result }) {
          toggleNotification({
            type: 'success',
            message: { id: 'Settings.webhooks.created' },
          });
          replace(`/settings/webhooks/${result.data.id}`);
          unlockApp();
        },
        onError(e) {
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
          onSuccess() {
            queryClient.invalidateQueries(['get-webhook', id]);
            toggleNotification({
              type: 'success',
              message: { id: 'notification.form.success.fields' },
            });
            unlockApp();
          },
          onError(e) {
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

  const isDraftAndPublishEvents = React.useMemo(
    () => collectionTypes.some((ct) => ct.options.draftAndPublish === true),
    [collectionTypes]
  );

  if (isLoading || isLoadingForModels) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main>
      <SettingsPageTitle name="Webhooks" />
      <WebhookForm
        {...{
          handleSubmit,
          data,
          triggerWebhook,
          isCreating,
          isTriggering,
          isTriggerIdle,
          triggerResponse: triggerResponse?.data.data,
          isDraftAndPublishEvents,
        }}
      />
    </Main>
  );
};

export default EditView;
