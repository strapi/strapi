import * as React from 'react';

import { Main } from '@strapi/design-system';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { useNavigate, useMatch } from 'react-router-dom';

import { CreateWebhook, TriggerWebhook } from '../../../../../../shared/contracts/webhooks';
import { Page } from '../../../../components/PageHelpers';
import { useTypedSelector } from '../../../../core/store/hooks';
import { useNotification } from '../../../../features/Notifications';
import { useAPIErrorHandler } from '../../../../hooks/useAPIErrorHandler';
import { selectAdminPermissions } from '../../../../selectors';
import { isBaseQueryError, type BaseQueryError } from '../../../../utils/baseQuery';

import { WebhookForm, WebhookFormProps, WebhookFormValues } from './components/WebhookForm';
import { useWebhooks } from './hooks/useWebhooks';

import type { SerializedError } from '@reduxjs/toolkit';
import type { Modules } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * EditView
 * -----------------------------------------------------------------------------------------------*/

/**
 * Messages for a URL that a `server.webhooks.destinationChecks` option blocks, by option. The
 * server's message names the option and the address for developers, so it isn't shown here.
 */
const BLOCKED_DESTINATION_MESSAGES: Record<string, MessageDescriptor> = {
  blockLoopback: {
    id: 'Settings.webhooks.error.destination.blockLoopback',
    defaultMessage:
      "This URL points to this server, so webhooks can't be sent to it. A developer can allow it in the server configuration.",
  },
  blockPrivateNetworks: {
    id: 'Settings.webhooks.error.destination.blockPrivateNetworks',
    defaultMessage:
      "This URL points to a private network, so webhooks can't be sent to it. A developer can allow it in the server configuration.",
  },
  blockLinkLocal: {
    id: 'Settings.webhooks.error.destination.blockLinkLocal',
    defaultMessage:
      "This URL points to a restricted network address, so webhooks can't be sent to it. A developer can allow it in the server configuration.",
  },
};

const getBlockedDestinationMessage = (
  error: BaseQueryError | SerializedError
): MessageDescriptor | undefined => {
  if (!isBaseQueryError(error) || error.name !== 'ApplicationError') {
    return undefined;
  }

  const { option } = (error.details ?? {}) as { option?: unknown };

  return typeof option === 'string' && Object.hasOwn(BLOCKED_DESTINATION_MESSAGES, option)
    ? BLOCKED_DESTINATION_MESSAGES[option]
    : undefined;
};

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

  /**
   * Prevents the notifications from showing up twice because the function identity
   * coming from the helper plugin is not stable
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFormatAPIError = React.useCallback(formatAPIError, []);

  const formatError = (err: BaseQueryError | SerializedError) => {
    const blockedDestination = getBlockedDestinationMessage(err);

    return blockedDestination ? formatMessage(blockedDestination) : formatAPIError(err);
  };

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
        message: stableFormatAPIError(error),
      });
    }
  }, [error, toggleNotification, stableFormatAPIError]);

  const handleTriggerWebhook = async () => {
    try {
      setIsTriggering(true);
      setTriggerResponse(undefined);

      const res = await triggerWebhook(id!);

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatError(res.error),
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

  const handleSubmit: WebhookFormProps['handleSubmit'] = async (data, helpers) => {
    try {
      if (isCreating) {
        const res = await createWebhook(cleanData(data));

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            helpers.setErrors(formatValidationErrors(res.error));
          } else {
            toggleNotification({
              type: 'danger',
              message: formatError(res.error),
            });
          }

          return;
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'Settings.webhooks.created' }),
        });

        navigate(`../webhooks/${res.data.id}`, { replace: true });
      } else {
        const res = await updateWebhook({ id: id!, ...cleanData(data) });

        if ('error' in res) {
          if (isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
            helpers.setErrors(formatValidationErrors(res.error));
          } else {
            toggleNotification({
              type: 'danger',
              message: formatError(res.error),
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
