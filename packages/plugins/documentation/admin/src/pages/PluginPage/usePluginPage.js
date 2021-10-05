import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { fetchData, deleteDoc, regenerateDoc, submit } from './utils/api';
import getTrad from '../../utils/getTrad';

const useHomePage = () => {
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { isLoading, data } = useQuery('get-documentation', () => fetchData(toggleNotification));

  const handleError = err => {
    toggleNotification({
      type: 'warning',
      message: err.response.payload.message,
    });
  };

  const deleteMutation = useMutation(deleteDoc, {
    onSuccess: async () => {
      await queryClient.invalidateQueries('get-documentation');
      toggleNotification({
        type: 'info',
        message: { id: getTrad('notification.delete.success') },
      });
    },
    onError: handleError,
  });

  const submitMutation = useMutation(submit, {
    onSuccess: () => {
      queryClient.invalidateQueries('get-documentation');

      toggleNotification({
        type: 'success',
        message: { id: getTrad('notification.update.success') },
      });
    },
    onError: handleError,
  });

  const regenerateDocMutation = useMutation(regenerateDoc, {
    onSuccess: () => {
      queryClient.invalidateQueries('get-documentation');

      toggleNotification({
        type: 'info',
        message: { id: getTrad('notification.generate.success') },
      });
    },
    onError: handleError,
  });

  return { data, isLoading, deleteMutation, submitMutation, regenerateDocMutation };
};

export default useHomePage;
