import { useQuery, useMutation, useQueryClient } from 'react-query';
import { fetchData, deleteDoc, regenerateDoc, submit } from './utils/api';
import getTrad from '../../utils/getTrad';

const useHomePage = () => {
  const queryClient = useQueryClient();
  const { isLoading, data } = useQuery('get-documentation', fetchData);

  const handleError = err => {
    strapi.notification.toggle({
      type: 'warning',
      message: err.response.payload.message,
    });
  };

  const deleteMutation = useMutation(deleteDoc, {
    onSuccess: () => {
      queryClient.invalidateQueries('get-documentation');
      strapi.notification.toggle({
        type: 'info',
        message: { id: getTrad('notification.delete.success') },
      });
    },
    onError: handleError,
  });

  const submitMutation = useMutation(submit, {
    onSuccess: () => {
      queryClient.invalidateQueries('get-documentation');

      strapi.notification.toggle({
        type: 'success',
        message: { id: getTrad('notification.update.success') },
      });
    },
    onError: handleError,
  });

  const regenerateDocMutation = useMutation(regenerateDoc, {
    onSuccess: () => {
      queryClient.invalidateQueries('get-documentation');

      strapi.notification.toggle({
        type: 'info',
        message: { id: getTrad('notification.generate.success') },
      });
    },
    onError: handleError,
  });

  return { data, isLoading, deleteMutation, submitMutation, regenerateDocMutation };
};

export default useHomePage;
