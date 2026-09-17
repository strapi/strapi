import { adminApi } from '@strapi/admin/strapi-admin';

const channelsApi = adminApi.enhanceEndpoints({
  addTagTypes: ['Channel', 'ChannelOverrides', 'Document'],
});

export interface Channel {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  color: string | null;
  archived: boolean;
  isDefault: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Per-channel override summary of one document: which attributes differ. */
export type EntryOverrides = Record<
  string,
  {
    channel: { id: number; slug: string; name?: string; color?: string | null };
    attributes: string[];
  }
>;

const endpoints = channelsApi.injectEndpoints({
  endpoints: (builder) => ({
    getMineChannels: builder.query<Channel[], void>({
      query: () => '/channels/mine',
      providesTags: [{ type: 'Channel', id: 'MINE' }],
    }),
    getAllChannels: builder.query<Channel[], void>({
      query: () => '/channels',
      providesTags: [{ type: 'Channel', id: 'ALL' }],
    }),
    getChannel: builder.query<Channel, number>({
      query: (id) => `/channels/${id}`,
      providesTags: (_res, _err, id) => [{ type: 'Channel', id }],
    }),
    createChannel: builder.mutation<
      Channel,
      { name: string; slug?: string; description?: string; color?: string | null; order?: number }
    >({
      query: (body) => ({ url: '/channels', method: 'POST', data: body }),
      invalidatesTags: ['Channel'],
    }),
    updateChannel: builder.mutation<
      Channel,
      {
        id: number;
        name?: string;
        description?: string | null;
        color?: string | null;
        order?: number;
        archived?: boolean;
        isDefault?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({ url: `/channels/${id}`, method: 'PUT', data: body }),
      invalidatesTags: ['Channel'],
    }),
    deleteChannel: builder.mutation<{ id: number; slug: string }, number>({
      query: (id) => ({ url: `/channels/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Channel', 'ChannelOverrides'],
    }),
    getEntryOverrides: builder.query<
      EntryOverrides,
      { model: string; documentId: string; locale?: string | null }
    >({
      query: ({ model, documentId, locale }) => ({
        url: `/channels/overrides/${model}/${documentId}`,
        method: 'GET',
        config: { params: locale ? { locale } : {} },
      }),
      providesTags: (_res, _err, { model, documentId }) => [
        { type: 'ChannelOverrides', id: `${model}_${documentId}` },
        'ChannelOverrides',
      ],
    }),
    resetOverrides: builder.mutation<
      { channel: string; attributes: string[] },
      {
        model: string;
        documentId: string;
        channel: string;
        locale?: string | null;
        attributes?: string[];
      }
    >({
      query: ({ model, documentId, ...body }) => ({
        url: `/channels/overrides/${model}/${documentId}/reset`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_res, _err, { model, documentId }) => [
        'ChannelOverrides',
        { type: 'Document', id: `${model}_${documentId}` },
        { type: 'Document', id: `${model}_LIST` },
      ],
    }),
  }),
});

export const {
  useGetMineChannelsQuery,
  useGetAllChannelsQuery,
  useGetChannelQuery,
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useDeleteChannelMutation,
  useGetEntryOverridesQuery,
  useResetOverridesMutation,
} = endpoints;

export { channelsApi };
