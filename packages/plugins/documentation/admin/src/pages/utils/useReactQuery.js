import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNotification, useFetchClient } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';

const useReactQuery = () => {
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { isLoading, isError, data } = useQuery(['get-documentation', pluginId], async () => {
    try {
      const { data } = await get(`/${pluginId}/getInfos`);

      return data;
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });

      // FIXME
      return null;
    }
  });

  const { del, post, put, get } = useFetchClient();

  const handleError = (err) => {
    toggleNotification({
      type: 'warning',
      message: err.response.payload.message,
    });
  };

  const handleSuccess = (type, tradId) => {
    queryClient.invalidateQueries('get-documentation');
    toggleNotification({
      type,
      message: { id: getTrad(tradId) },
    });
  };

  const deleteMutation = useMutation(
    ({ prefix, version }) => del(`${prefix}/deleteDoc/${version}`),
    {
      onSuccess: () => handleSuccess('info', 'notification.delete.success'),
      onError: (error) => handleError(error),
    }
  );

  const submitMutation = useMutation(({ prefix, body }) => put(`${prefix}/updateSettings`, body), {
    onSuccess: () => handleSuccess('success', 'notification.update.success'),
    onError: handleError,
  });

  const regenerateDocMutation = useMutation(
    ({ prefix, version }) => post(`${prefix}/regenerateDoc`, { version }),
    {
      onSuccess: () => handleSuccess('info', 'notification.generate.success'),
      onError: (error) => handleError(error),
    }
  );

  return { data, isLoading, isError, deleteMutation, submitMutation, regenerateDocMutation };
};

export default useReactQuery;
