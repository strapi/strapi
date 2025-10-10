import { adminApi } from '../../../../admin/src/services/api';
import { GetAiUsage, GetAiToken } from '../../../../shared/contracts/ai';

const aiService = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    getAIUsage: builder.query<GetAiUsage.Response, void>({
      query: () => ({
        method: 'GET',
        url: `/admin/ai-usage`,
      }),
      providesTags: ['AIUsage'],
    }),
    getAiToken: builder.query<GetAiToken.Response['data'], void>({
      query: () => ({
        method: 'GET',
        url: '/admin/ai-token',
      }),
      transformResponse(res: GetAiToken.Response) {
        return res.data;
      },
    }),
  }),
  overrideExisting: true,
});

const { useGetAIUsageQuery, useGetAiTokenQuery, useLazyGetAiTokenQuery } = aiService;

export { useGetAIUsageQuery, useGetAiTokenQuery, useLazyGetAiTokenQuery };
