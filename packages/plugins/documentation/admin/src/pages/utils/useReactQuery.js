import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { fetchDocumentationVersions, deleteDoc, regenerateDoc, updateSettings } from './api';
import getTrad from '../../utils/getTrad';

const useReactQuery = () => {
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { isLoading, data } = useQuery('get-documentation', () =>
    fetchDocumentationVersions(toggleNotification)
  );

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

  const deleteMutation = useMutation(deleteDoc, {
    onSuccess: () => handleSuccess('info', 'notification.delete.success'),
    onError: (error) => handleError(error),
  });

  const submitMutation = useMutation(updateSettings, {
    onSuccess: () => handleSuccess('success', 'notification.update.success'),
    onError: handleError,
  });

  const regenerateDocMutation = useMutation(regenerateDoc, {
    onSuccess: () => handleSuccess('info', 'notification.generate.success'),
    onError: (error) => handleError(error),
  });

  return { data, isLoading, deleteMutation, submitMutation, regenerateDocMutation };
};

export default useReactQuery;
