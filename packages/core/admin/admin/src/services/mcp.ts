import { adminApi } from './api';

import type {
  GetMcpOAuthAuthorizationRequest,
  SubmitMcpOAuthConsent,
} from '../../../shared/contracts/mcp';

const mcpService = adminApi.injectEndpoints({
  endpoints: (builder) => ({
    getMcpOAuthAuthorizationRequest: builder.query<
      GetMcpOAuthAuthorizationRequest.Response['data'],
      GetMcpOAuthAuthorizationRequest.Request['query']
    >({
      query: ({ ticket }) => ({
        method: 'GET',
        url: '/admin/mcp/oauth/authorization-request',
        config: {
          params: { ticket },
        },
      }),
      transformResponse(res: GetMcpOAuthAuthorizationRequest.Response) {
        return res.data;
      },
    }),
    submitMcpOAuthConsent: builder.mutation<
      SubmitMcpOAuthConsent.Response['data'],
      SubmitMcpOAuthConsent.Request['body']
    >({
      query: (body) => ({
        method: 'POST',
        url: '/admin/mcp/oauth/consent',
        data: body,
      }),
      transformResponse(res: SubmitMcpOAuthConsent.Response) {
        return res.data;
      },
    }),
  }),
  overrideExisting: false,
});

const { useGetMcpOAuthAuthorizationRequestQuery, useSubmitMcpOAuthConsentMutation } = mcpService;

export { useGetMcpOAuthAuthorizationRequestQuery, useSubmitMcpOAuthConsentMutation };
