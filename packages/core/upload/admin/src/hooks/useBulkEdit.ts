import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient } from 'react-query';

import { BulkUpdateFiles } from '../../../shared/contracts/files';
import { pluginId } from '../pluginId';
import { getTrad } from '../utils';

interface FileInfoUpdate {
  name: string;
  alternativeText: string | null;
  caption: string | null;
  folder: number | null;
}

interface BulkEditParams {
  updates: Array<{
    id: number;
    fileInfo: FileInfoUpdate;
  }>;
}

export const useBulkEdit = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const queryClient = useQueryClient();
  const { post } = useFetchClient();

  const bulkEditQuery = ({ updates }: BulkEditParams) => {
    return post('/upload/actions/bulk-update', { updates });
  };

  const mutation = useMutation<
    BulkUpdateFiles.Response,
    BulkUpdateFiles.Response['error'],
    BulkEditParams
  >(bulkEditQuery, {
    onSuccess(res) {
      const { data } = res;

      if (data && data.length > 0) {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });
        queryClient.refetchQueries([pluginId, 'folders'], { active: true });
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTrad('modal.edit.success-label'),
          defaultMessage: 'Files have been successfully updated.',
        }),
      });
    },
  });

  const edit = (
    updates: Array<{
      id: number;
      fileInfo: FileInfoUpdate;
    }>
  ) => mutation.mutateAsync({ updates });

  return { ...mutation, edit };
};
