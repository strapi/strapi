import { GetPreviewUrl } from '../../../../shared/contracts/preview';
import { contentManagerApi } from '../../services/api';

const previewApi = contentManagerApi.injectEndpoints({
  endpoints: (builder) => ({
    getPreviewUrl: builder.query<GetPreviewUrl.Response, GetPreviewUrl.Request>({
      query({ query, params }) {
        return {
          url: `/content-manager/preview/url/${params.contentType}`,
          method: 'GET',
          config: {
            params: query,
          },
        };
      },
    }),
  }),
});

const { useGetPreviewUrlQuery } = previewApi;

export { useGetPreviewUrlQuery };
