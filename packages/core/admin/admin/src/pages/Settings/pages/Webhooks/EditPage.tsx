import * as React from 'react';

import { Main } from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
} from '@strapi/helper-plugin';
import { Webhook } from '@strapi/types';
import { AxiosError, AxiosResponse } from 'axios';
import { useMutation, useQuery } from 'react-query';
import { useHistory, useRouteMatch } from 'react-router-dom';

import {
  CreateWebhook,
  GetWebhook,
  TriggerWebhook,
  UpdateWebhook,
} from '../../../../../../shared/contracts/webhooks';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useContentTypes } from '../../../../hooks/useContentTypes';
import { selectAdminPermissions } from '../../../../selectors';

import { WebhookForm, WebhookFormValues } from './components/WebhookForm';

/* -------------------------------------------------------------------------------------------------
 * EditView
 * -----------------------------------------------------------------------------------------------*/

const cleanData = (
  data: WebhookFormValues
): Omit<CreateWebhook.Request['body'], 'id' | 'isEnabled'> => ({
  ...data,
  headers: data.headers.reduce<Webhook['headers']>((acc, { key, value }) => {
    if (key !== '') {
      acc[key] = value;
    }

    return acc;
  }, {}),
});

const EditPage = () => {
  const match = useRouteMatch<{ id: string }>('/settings/webhooks/:id');
  const id = match?.params.id;
  const isCreating = id === 'create';

  const { replace } = useHistory();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const { isLoading: isLoadingForModels } = useContentTypes();
  const { put, get, post } = useFetchClient();

  const {
    isLoading,
    data: webhookData,
    error: webhookError,
    refetch: refetchWebhook,
  } = useQuery<
    GetWebhook.Response['data'],
    AxiosError<Required<Pick<GetWebhook.Response, 'error'>>>
  >(
    ['webhooks', id],
    async () => {
      const {
        data: { data },
      } = await get<GetWebhook.Response>(`/admin/webhooks/${id}`);

      return data;
    },
    {
      enabled: !isCreating,
    }
  );

  React.useEffect(() => {
    if (webhookError) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(webhookError),
      });
    }
  }, [webhookError, toggleNotification, formatAPIError]);

  const {
    isLoading: isTriggering,
    data: triggerResponse,
    mutate,
  } = useMutation<
    TriggerWebhook.Response['data'],
    AxiosError<Required<Pick<TriggerWebhook.Response, 'error'>>>
  >(
    () =>
      post<TriggerWebhook.Response>(`/admin/webhooks/${id}/trigger`).then((res) => res.data.data),
    {
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const createWebhookMutation = useMutation<
    AxiosResponse<CreateWebhook.Response>,
    AxiosError<Required<Pick<CreateWebhook.Response, 'error'>>>,
    Omit<CreateWebhook.Request['body'], 'id' | 'isEnabled'>
  >((body) => post('/admin/webhooks', body), {
    onSuccess({ data: result }) {
      toggleNotification({
        type: 'success',
        message: { id: 'Settings.webhooks.created' },
      });
      replace(`/settings/webhooks/${result.data.id}`);
    },
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    },
  });

  const updateWebhookMutation = useMutation<
    AxiosResponse<UpdateWebhook.Response>,
    AxiosError<Required<Pick<UpdateWebhook.Response, 'error'>>>,
    { id: UpdateWebhook.Request['body']['id']; body: Omit<UpdateWebhook.Request['body'], 'id'> }
  >(({ id, body }) => put(`/admin/webhooks/${id}`, body), {
    onSuccess() {
      refetchWebhook();
      toggleNotification({
        type: 'success',
        message: { id: 'notification.form.success.fields' },
      });
    },
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    },
  });

  const handleSubmit = async (data: WebhookFormValues) => {
    if (isCreating) {
      createWebhookMutation.mutate(cleanData(data));
      return;
    }
    updateWebhookMutation.mutate({ id, body: cleanData(data) });
  };

  if (isLoading || isLoadingForModels) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Main>
      <SettingsPageTitle name="Webhooks" />
      <WebhookForm
        data={webhookData}
        handleSubmit={handleSubmit}
        triggerWebhook={mutate}
        isCreating={isCreating}
        isTriggering={isTriggering}
        triggerResponse={triggerResponse}
      />
    </Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedEditView
 * -----------------------------------------------------------------------------------------------*/

const ProtectedEditPage = () => {
  const permissions = useTypedSelector(selectAdminPermissions);

  return (
    <CheckPagePermissions permissions={permissions.settings?.webhooks.update}>
      <EditPage />
    </CheckPagePermissions>
  );
};

export { ProtectedEditPage, EditPage };
