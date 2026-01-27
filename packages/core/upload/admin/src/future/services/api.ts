import { adminApi } from '@strapi/admin/strapi-admin';

import type { CreateFile } from '../../../../shared/contracts/files';

const uploadApi = adminApi
  .enhanceEndpoints({
    addTagTypes: ['Asset', 'Folder'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      uploadFiles: builder.mutation<CreateFile.Response, FormData>({
        query: (formData) => ({
          url: '/upload',
          method: 'POST',
          data: formData,
        }),
        invalidatesTags: ['Asset'],
      }),
    }),
  });

export const { useUploadFilesMutation } = uploadApi;
export { uploadApi };
