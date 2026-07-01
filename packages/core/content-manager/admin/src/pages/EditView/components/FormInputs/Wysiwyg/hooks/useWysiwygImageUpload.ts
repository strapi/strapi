import * as React from 'react';

import { useFetchClient } from '@strapi/admin/strapi-admin';

interface UploadedFile {
  alternativeText?: string | null;
  mime: string;
  name: string;
  url: string;
}

export const useWysiwygImageUpload = () => {
  const { post } = useFetchClient();

  const uploadImages = React.useCallback(
    async (files: File[]) => {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append('files', file);
        formData.append(
          'fileInfo',
          JSON.stringify({
            name: file.name,
            alternativeText: file.name,
            folder: null,
          })
        );
      });

      const response = await post<UploadedFile[]>('/upload', formData);

      return response.data;
    },
    [post]
  );

  return { uploadImages };
};
