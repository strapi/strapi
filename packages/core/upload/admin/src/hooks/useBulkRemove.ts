import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';

import { BulkDeleteFiles, File } from '../../../shared/contracts/files';
import { pluginId } from '../pluginId';
import { getTrad } from '../utils';

import type { BulkDeleteFolders, FolderDefinition } from '../../../shared/contracts/folders';

export interface FileWithType extends File {
  type: string;
}

type BulkRemovePayload = Partial<BulkDeleteFiles.Request['body']> &
  Partial<BulkDeleteFolders.Request['body']>;

export const useBulkRemove = () => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { post } = useFetchClient();

  const bulkRemoveQuery = (filesAndFolders: Array<FileWithType | FolderDefinition>) => {
    const payload = filesAndFolders.reduce<BulkRemovePayload>((acc, selected) => {
      const { id, type } = selected;
      const key = type === 'asset' ? 'fileIds' : 'folderIds';

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key]!.push(id);

      return acc;
    }, {});

    return post('/upload/actions/bulk-delete', payload);
  };

  const mutation = useMutation<
    BulkDeleteFiles.Response | BulkDeleteFolders.Response,
    BulkDeleteFiles.Response['error'] | BulkDeleteFolders.Response['error'],
    Array<FileWithType | FolderDefinition>
  >(bulkRemoveQuery, {
    onSuccess(res) {
      const {
        data: { data },
      } = res;

      if (data?.files?.length > 0) {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      }

      if (data?.folders?.length > 0) {
        queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('modal.remove.success-label'),
          defaultMessage: 'Elements have been successfully deleted.',
        }),
      });
    },
    onError(error) {
      toggleNotification({ type: 'danger', message: error?.message });
    },
  });

  const remove = (...args: Parameters<typeof mutation.mutateAsync>) =>
    mutation.mutateAsync(...args);

  return { ...mutation, remove };
};
