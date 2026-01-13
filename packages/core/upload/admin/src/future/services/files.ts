import { uploadApi } from './api';

import type { CreateFile, File, RawFile } from '../../../../shared/contracts/files';

interface Asset extends Omit<File, 'id' | 'hash'> {
  rawFile?: RawFile;
  id?: File['id'];
  hash?: File['hash'];
}

interface UploadFilesArgs {
  assets: Asset | Asset[];
  folderId: number | null;
  onProgress?: (progress: number) => void;
}

const filesApi = uploadApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    uploadFiles: builder.mutation<CreateFile.Response['data'], UploadFilesArgs>({
      queryFn: async ({ assets, folderId, onProgress }, { signal, getState }) => {
        // Get token from auth state
        const state = getState();
        // @ts-expect-error plop
        const token = state.admin_app.token;

        // Build FormData
        const assetsArray = Array.isArray(assets) ? assets : [assets];
        const formData = new FormData();

        // Add all files to the form data
        assetsArray.forEach((asset) => {
          if (asset.rawFile) {
            formData.append('files', asset.rawFile);
          }
        });

        // Add each fileInfo as a separate stringified field
        assetsArray.forEach((asset) => {
          formData.append(
            'fileInfo',
            JSON.stringify({
              name: asset.name,
              caption: asset.caption,
              alternativeText: asset.alternativeText,
              folder: folderId,
            })
          );
        });

        // Return promise that resolves via XMLHttpRequest
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Progress tracking
          if (onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                onProgress(percentComplete);
              }
            });
          }

          // Handle completion
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve({ data: response });
              } catch (error) {
                reject({ error: { status: 'PARSING_ERROR', error: 'Failed to parse response' } });
              }
            } else {
              try {
                const error = JSON.parse(xhr.responseText);
                reject({ error: { status: xhr.status, data: error } });
              } catch {
                reject({
                  error: { status: xhr.status, error: `Upload failed with status ${xhr.status}` },
                });
              }
            }
          });

          // Handle errors
          xhr.addEventListener('error', () => {
            reject({ error: { status: 'FETCH_ERROR', error: 'Network error occurred' } });
          });

          xhr.addEventListener('abort', () => {
            reject({ error: { status: 'FETCH_ERROR', error: 'Upload cancelled' } });
          });

          // Handle abort signal
          if (signal) {
            signal.addEventListener('abort', () => {
              xhr.abort();
            });
          }

          // Open and send request
          const backendURL = window.strapi.backendURL;
          xhr.open('POST', `${backendURL}/upload`);

          // Set auth header if token exists
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }

          xhr.send(formData);
        });
      },
      invalidatesTags: ['Asset', 'HomepageKeyStatistics', 'AIUsage'],
    }),
  }),
});

const { useUploadFilesMutation } = filesApi;

export { useUploadFilesMutation };
