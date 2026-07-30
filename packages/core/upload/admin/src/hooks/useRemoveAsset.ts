import {
  useNotification,
  useFetchClient,
  FetchResponse,
  adminApi,
} from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQueryClient, UseMutationResult } from 'react-query';
import { useDispatch } from 'react-redux';

import { pluginId } from '../pluginId';

import type { DeleteFile } from '../../../shared/contracts/files';

type UseRemoveAsset = {
  removeAsset: (assetId: number) => Promise<void>;
} & UseMutationResult<FetchResponse<DeleteFile.Response>, Error, number>;

export const useRemoveAsset = (onSuccess: () => void): UseRemoveAsset => {
  const dispatch = useDispatch();
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
        dispatch(adminApi.util.invalidateTags(['HomepageKeyStatistics']));

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
