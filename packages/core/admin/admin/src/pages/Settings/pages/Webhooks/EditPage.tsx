import * as React from 'react';

import { Main } from '@strapi/design-system';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  SettingsPageTitle,
  useAPIErrorHandler,
  useNotification,
} from '@strapi/helper-plugin';
import { Webhook } from '@strapi/types';
import { FormikHelpers } from 'formik';
import { useHistory, useRouteMatch } from 'react-router-dom';

import { CreateWebhook, TriggerWebhook } from '../../../../../../shared/contracts/webhooks';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useContentTypes } from '../../../../hooks/useContentTypes';
import { selectAdminPermissions } from '../../../../selectors';
import { isBaseQueryError } from '../../../../utils/baseQuery';

import { WebhookForm, WebhookFormValues } from './components/WebhookForm';
import { useWebhooks } from './hooks/useWebhooks';

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
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
  const { isLoading: isLoadingForModels } = useContentTypes();
  const [isTriggering, setIsTriggering] = React.useState(false);
  const [triggerResponse, setTriggerResponse] = React.useState<TriggerWebhook.Response['data']>();

  const { isLoading, webhooks, error, createWebhook, updateWebhook, triggerWebhook } = useWebhooks(
    { id: id! },
    {
      skip: isCreating,
    }
  );

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [error, toggleNotification, formatAPIError]);

  const handleTriggerWebhook = async () => {
    try {
      setIsTriggering(true);

      const res = await triggerWebhook(id!);

      if ('error' in res) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });

        return;
      }

      setTriggerResponse(res.data);
    } catch {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        },
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSubmit = async (
    data: WebhookFormValues,
    formik: FormikHelpers<WebhookFormValues>
  ) => {
    try {
      if (isCreating) {
        const res = await createWebhook(cleanData(data));

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            formik.setErrors(formatValidationErrors(res.error));
          } else {
            toggleNotification({
              type: 'warning',
              message: formatAPIError(res.error),
            });
          }

          return;
        }

        toggleNotification({
          type: 'success',
          message: { id: 'Settings.webhooks.created' },
        });

        replace(`/settings/webhooks/${res.data.id}`);
      } else {
        const res = await updateWebhook({ id: id!, ...cleanData(data) });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            formik.setErrors(formatValidationErrors(res.error));
          } else {
            toggleNotification({
              type: 'warning',
              message: formatAPIError(res.error),
            });
          }

          return;
        }

        toggleNotification({
          type: 'success',
          message: { id: 'notification.form.success.fields' },
        });
      }
    } catch {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        },
      });
    }
  };

  if (isLoading || isLoadingForModels) {
    return <LoadingIndicatorPage />;
  }

  const [webhook] = webhooks ?? [];

  return (
    <Main>
      <SettingsPageTitle name="Webhooks" />
      <WebhookForm
        data={webhook}
        handleSubmit={handleSubmit}
        triggerWebhook={handleTriggerWebhook}
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
