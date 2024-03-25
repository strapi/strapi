import * as React from 'react';

import { Main } from '@strapi/design-system';
import { Modules } from '@strapi/types';
import { FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useNavigate, useMatch } from 'react-router-dom';

import { CreateWebhook, TriggerWebhook } from '../../../../../../shared/contracts/webhooks';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
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
  headers: data.headers.reduce<Modules.WebhookStore.Webhook['headers']>((acc, { key, value }) => {
    if (key !== '') {
      acc[key] = value;
    }

    return acc;
  }, {}),
});

const EditPage = () => {
  const { formatMessage } = useIntl();
  const match = useMatch('/settings/webhooks/:id');
  const id = match?.params.id;
  const isCreating = id === 'create';

  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const {
    _unstableFormatAPIError: formatAPIError,
    _unstableFormatValidationErrors: formatValidationErrors,
  } = useAPIErrorHandler();
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
        type: 'danger',
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
          type: 'danger',
          message: formatAPIError(res.error),
        });

        return;
      }

      setTriggerResponse(res.data);
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
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
              type: 'danger',
              message: formatAPIError(res.error),
            });
          }

          return;
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'Settings.webhooks.created' }),
        });

        navigate(res.data.id, { replace: true });
      } else {
        const res = await updateWebhook({ id: id!, ...cleanData(data) });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            formik.setErrors(formatValidationErrors(res.error));
          } else {
            toggleNotification({
              type: 'danger',
              message: formatAPIError(res.error),
            });
          }

          return;
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'notification.form.success.fields' }),
        });
      }
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
      });
    }
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  const [webhook] = webhooks ?? [];

  return (
    <Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Webhooks',
          }
        )}
      </Page.Title>
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
    <Page.Protect permissions={permissions.settings?.webhooks.update}>
      <EditPage />
    </Page.Protect>
  );
};

export { ProtectedEditPage, EditPage };
