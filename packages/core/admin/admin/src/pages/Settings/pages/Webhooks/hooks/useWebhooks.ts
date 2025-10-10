import { SerializedError } from '@reduxjs/toolkit';

import { GetWebhook, GetWebhooks } from '../../../../../../../shared/contracts/webhooks';
import {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useTriggerWebhookMutation,
  useDeleteManyWebhooksMutation,
} from '../../../../../services/webhooks';
import { BaseQueryError } from '../../../../../utils/baseQuery';

const useWebhooks = (
  args: GetWebhook.Params | void = undefined,
  queryArgs?: Parameters<typeof useGetWebhooksQuery>[1]
) => {
  const { data: webhooks, isLoading, error } = useGetWebhooksQuery(args, queryArgs);
  const [createWebhook, { error: createError }] = useCreateWebhookMutation();
  const [updateWebhook, { error: updateError }] = useUpdateWebhookMutation();

  const [triggerWebhook] = useTriggerWebhookMutation();
  const [deleteManyWebhooks] = useDeleteManyWebhooksMutation();

  return {
    webhooks: webhooks as GetWebhooks.Response['data'] | undefined,
    isLoading: isLoading as boolean,
    error: (error || createError || updateError) as BaseQueryError | SerializedError,
    createWebhook,
    updateWebhook,
    triggerWebhook,
    deleteManyWebhooks,
  };
};

export { useWebhooks };
