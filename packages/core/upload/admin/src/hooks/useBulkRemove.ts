import { Data } from '@strapi/types';
import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';

import pluginId from '../pluginId';
import { getTrad } from '../utils';

import { BulkDeleteFiles, Asset } from '../../../shared/contracts/files';
import { BulkDeleteFolders, Folder } from '../../../shared/contracts/folders';

export interface FolderWithType extends Folder {
  type: string;
}

export interface AssetWithType extends Asset {
  type: string;
}

// Define the shape of the accumulator object
type Payload = {
  fileIds?: Data.ID[];
  folderIds?: Data.ID[];
};

export const useBulkRemove = () => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { post } = useFetchClient();

  const bulkRemoveQuery = (filesAndFolders: Array<AssetWithType | FolderWithType>) => {
    const payload = filesAndFolders.reduce<Payload>(
      (acc, selected) => {
        const { id, type } = selected;
        const key = type === 'asset' ? 'fileIds' : 'folderIds';

        if (!acc[key]) {
          acc[key] = [];
        }

        acc[key]?.push(id);

        return acc;
      },
      {} as BulkDeleteFiles.Request['body'] | BulkDeleteFolders.Request['body']
    );

    return post('/upload/actions/bulk-delete', payload);
  };

  const mutation = useMutation<
    BulkDeleteFiles.Response | BulkDeleteFolders.Response,
    BulkDeleteFiles.Response['error'] | BulkDeleteFolders.Response['error'],
    Array<AssetWithType | FolderWithType>
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

  const remove = (args: Array<AssetWithType | FolderWithType>) => mutation.mutateAsync(args);

  return { ...mutation, remove };
};
