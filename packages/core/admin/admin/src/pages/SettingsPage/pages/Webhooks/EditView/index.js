/**
 *
 * EditView
 *
 */
import React, { useCallback, useMemo } from 'react';
import {
  LoadingIndicatorPage,
  request,
  SettingsPageTitle,
  to,
  useNotification,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/design-system/Main';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { useModels } from '../../../../../hooks';
import { axiosInstance } from '../../../../../core/utils';
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
  const { isLoading: isLoadingForModels, collectionTypes } = useModels();

  const isCreating = id === 'create';

  const fetchWebhook = useCallback(
    async (id) => {
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

  const { isLoading, data } = useQuery(['get-webhook', id], () => fetchWebhook(id), {
    enabled: !isCreating,
  });

  const {
    isLoading: isTriggering,
    data: triggerResponse,
    isIdle: isTriggerIdle,
    mutate,
  } = useMutation(() => {
    return axiosInstance.post(`/admin/webhooks/${id}/trigger`);
  });

  const triggerWebhook = () =>
    mutate(null, {
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
    });

  const createWebhookMutation = useMutation((body) =>
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

  const handleSubmit = async (data) => {
    if (isCreating) {
      lockApp();
      createWebhookMutation.mutate(cleanData(data), {
        onSuccess(result) {
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

  const isDraftAndPublishEvents = useMemo(
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
