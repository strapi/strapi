import { adminApi } from '../../../../admin/src/services/api';
import { GetAiUsage, GetAiToken, GetAiFeatureConfig } from '../../../../shared/contracts/ai';

const aiService = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    getAiUsage: builder.query<GetAiUsage.Response, void>({
      query: () => ({
        method: 'GET',
        url: `/admin/ai-usage`,
      }),
      providesTags: ['AiUsage'],
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
    getAiFeatureConfig: builder.query<GetAiFeatureConfig.Response['data'], void>({
      query: () => ({
        method: 'GET',
        url: '/admin/ai-feature-config',
      }),
      transformResponse(res: GetAiFeatureConfig.Response) {
        return res.data;
      },
      providesTags: ['AiFeatureConfig'],
    }),
  }),
  overrideExisting: true,
});

const {
  useGetAiUsageQuery,
  useGetAiTokenQuery,
  useLazyGetAiTokenQuery,
  useGetAiFeatureConfigQuery,
} = aiService;

export {
  useGetAiUsageQuery,
  useGetAiTokenQuery,
  useLazyGetAiTokenQuery,
  useGetAiFeatureConfigQuery,
};
