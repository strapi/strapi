import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';

import { File, BulkMoveFiles } from '../../../shared/contracts/files';
import { Folder, BulkMoveFolders } from '../../../shared/contracts/folders';
import { pluginId } from '../pluginId';
import { getTrad } from '../utils';

export interface FolderWithType extends Folder {
  type: string;
}

export interface FileWithType extends File {
  type: string;
}

interface BulkMoveParams {
  destinationFolderId: number | string;
  filesAndFolders: Array<FolderWithType | FileWithType>;
}

// Define the shape of the accumulator object
type Payload = {
  fileIds?: number[];
  folderIds?: number[];
};

export const useBulkMove = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const queryClient = useQueryClient();
  const { post } = useFetchClient();

  const bulkMoveQuery = ({ destinationFolderId, filesAndFolders }: BulkMoveParams) => {
    const payload = filesAndFolders.reduce<Payload>((acc, selected) => {
      const { id, type } = selected;
      const key = type === 'asset' ? 'fileIds' : 'folderIds';

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key]!.push(id);

      return acc;
    }, {});

    return post('/upload/actions/bulk-move', { ...payload, destinationFolderId });
  };

  const mutation = useMutation<
    BulkMoveFolders.Response | BulkMoveFiles.Response,
    BulkMoveFolders.Response['error'] | BulkMoveFiles.Response['error'],
    BulkMoveParams
  >(bulkMoveQuery, {
    onSuccess(res) {
      const {
        data: { data },
      } = res;

      if (data?.files?.length > 0) {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
      }

      // folders need to be re-fetched in any case, because assets might have been
      // moved into a sub-folder and therefore the count needs to be updated
      queryClient.refetchQueries([pluginId, 'folders'], { active: true });

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('modal.move.success-label'),
          defaultMessage: 'Elements have been moved successfully.',
        }),
      });
    },
  });

  const move = (
    destinationFolderId: number | string,
    filesAndFolders: Array<FolderWithType | FileWithType>
  ) => mutation.mutateAsync({ destinationFolderId, filesAndFolders });

  return { ...mutation, move };
};
