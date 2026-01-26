import { adminApi } from '@strapi/admin/strapi-admin';

const uploadApi = adminApi
  .enhanceEndpoints({
    addTagTypes: ['Asset', 'Folder'],
  })
  .injectEndpoints({
    endpoints: (builder) => ({
      uploadFiles: builder.mutation<unknown, FormData>({
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
