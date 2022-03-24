import { useMutation, useQueryClient } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { axiosInstance, getRequestUrl } from '../utils';

const editFolderRequest = folder => {
  const query = folder?.id ? `?id=${folder.id}` : '';
  const url = getRequestUrl(`folders${query}`);
  const formData = Object.entries(folder).reduce((acc, [key, value]) => {
    acc.append(key, value);

    return acc;
  }, new FormData());

  return axiosInstance.post(url, formData).then(res => res.data);
};

export const useEditFolder = () => {
  const toggleNotification = useNotification();
  const queryClient = useQueryClient();

  const mutation = useMutation(({ folder }) => editFolderRequest(folder), {
    onSuccess: () => {
      queryClient.refetchQueries(['folder'], { active: true });
    },
    onError: reason => {
      toggleNotification({ type: 'warning', message: reason.message });
    },
  });

  const editFolder = folder => mutation.mutateAsync({ folder });

  return { ...mutation, editFolder, status: mutation.status };
};
