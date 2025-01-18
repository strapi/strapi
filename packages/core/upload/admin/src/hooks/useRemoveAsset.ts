import { useNotification, useFetchClient, FetchResponse } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient, UseMutationResult } from 'react-query';

import { pluginId } from '../pluginId';

import type { DeleteFile } from '../../../shared/contracts/files';

type UseRemoveAsset = {
  removeAsset: (assetId: number) => Promise<void>;
} & UseMutationResult<FetchResponse<DeleteFile.Response>, Error, number>;

export const useRemoveAsset = (onSuccess: () => void): UseRemoveAsset => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  const { del } = useFetchClient();

  const mutation = useMutation(
    (assetId: number) => del<DeleteFile.Response>(`/upload/files/${assetId}`),
    {
      onSuccess() {
        queryClient.refetchQueries([pluginId, 'assets'], { active: true });
        queryClient.refetchQueries([pluginId, 'asset-count'], { active: true });

        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'modal.remove.success-label',
            defaultMessage: 'Elements have been successfully deleted.',
          }),
        });

        onSuccess();
      },
      onError(error: Error) {
        toggleNotification({ type: 'danger', message: error.message });
      },
    }
  );

  const removeAsset = async (assetId: number) => {
    await mutation.mutateAsync(assetId);
  };

  return { ...mutation, removeAsset };
};
