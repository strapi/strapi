import * as Webhooks from '../../../shared/contracts/webhooks';

import { adminApi } from './api';

const webhooksSerivce = adminApi
  .enhanceEndpoints({
    addTagTypes: ['Webhook'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      getWebhooks: builder.query<
        Webhooks.GetWebhooks.Response['data'],
        Webhooks.GetWebhook.Params | void
      >({
        query: (args) => ({
          url: `/admin/webhooks/${args?.id ?? ''}`,
          method: 'GET',
        }),
        transformResponse: (
          response: Webhooks.GetWebhooks.Response | Webhooks.GetWebhook.Response
        ) => {
          if (Array.isArray(response.data)) {
            return response.data;
          } else {
            return [response.data];
          }
        },
        providesTags: (res, _err, arg) => {
          if (typeof arg === 'object' && 'id' in arg) {
            return [{ type: 'Webhook' as const, id: arg.id }];
          } else {
            return [
              ...(res?.map(({ id }) => ({ type: 'Webhook' as const, id })) ?? []),
              { type: 'Webhook' as const, id: 'LIST' },
            ];
          }
        },
      }),
      createWebhook: builder.mutation<
        Webhooks.CreateWebhook.Response['data'],
        Omit<Webhooks.CreateWebhook.Request['body'], 'id' | 'isEnabled'>
      >({
        query: (body) => ({
          url: `/admin/webhooks`,
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: Webhooks.CreateWebhook.Response) => response.data,
        invalidatesTags: [{ type: 'Webhook', id: 'LIST' }],
      }),
      updateWebhook: builder.mutation<
        Webhooks.UpdateWebhook.Response['data'],
        Webhooks.UpdateWebhook.Request['body'] & Webhooks.UpdateWebhook.Params
      >({
        query: ({ id, ...body }) => ({
          url: `/admin/webhooks/${id}`,
          method: 'PUT',
          data: body,
        }),
        transformResponse: (response: Webhooks.UpdateWebhook.Response) => response.data,
        invalidatesTags: (_res, _err, { id }) => [{ type: 'Webhook', id }],
      }),
      triggerWebhook: builder.mutation<
        Webhooks.TriggerWebhook.Response['data'],
        Webhooks.TriggerWebhook.Params['id']
      >({
        query: (webhookId) => ({
          url: `/admin/webhooks/${webhookId}/trigger`,
          method: 'POST',
        }),
        transformResponse: (response: Webhooks.TriggerWebhook.Response) => response.data,
      }),
      deleteManyWebhooks: builder.mutation<
        Webhooks.DeleteWebhooks.Response['data'],
        Webhooks.DeleteWebhooks.Request['body']
      >({
        query: (body) => ({
          url: `/admin/webhooks/batch-delete`,
          method: 'POST',
          data: body,
        }),
        transformResponse: (response: Webhooks.DeleteWebhooks.Response) => response.data,
        invalidatesTags: (_res, _err, { ids }) => ids.map((id) => ({ type: 'Webhook', id })),
      }),
    }),
    overrideExisting: false,
  });

const {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useTriggerWebhookMutation,
  useDeleteManyWebhooksMutation,
} = webhooksSerivce;

export {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useTriggerWebhookMutation,
  useDeleteManyWebhooksMutation,
};
