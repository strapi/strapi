import { adminApi } from '../../../../admin/src/services/api';
import { GetAiUsage, GetAiToken, GetAIFeatureConfig } from '../../../../shared/contracts/ai';

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
    getAIFeatureConfig: builder.query<GetAIFeatureConfig.Response['data'], void>({
      query: () => ({
        method: 'GET',
        url: '/admin/ai-feature-config',
      }),
      transformResponse(res: GetAIFeatureConfig.Response) {
        return res.data;
      },
      providesTags: ['AIFeatureConfig'],
    }),
  }),
  overrideExisting: true,
});

const {
  useGetAIUsageQuery,
  useGetAiTokenQuery,
  useLazyGetAiTokenQuery,
  useGetAIFeatureConfigQuery,
} = aiService;

export {
  useGetAIUsageQuery,
  useGetAiTokenQuery,
  useLazyGetAiTokenQuery,
  useGetAIFeatureConfigQuery,
};
