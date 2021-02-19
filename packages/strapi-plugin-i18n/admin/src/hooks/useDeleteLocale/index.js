import { request } from 'strapi-helper-plugin';
import { useMutation, useQueryClient } from 'react-query';
import { getTrad } from '../../utils';

const deleteLocale = async id => {
  try {
    const data = await request(`/i18n/locales/${id}`, {
      method: 'DELETE',
    });

    strapi.notification.toggle({
      type: 'success',
      message: { id: getTrad('Settings.locales.modal.delete.success') },
    });

    return data;
  } catch (e) {
    strapi.notification.toggle({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return e;
  }
};

const useDeleteLocale = () => {
  const queryClient = useQueryClient();

  const { isLoading, mutateAsync } = useMutation(deleteLocale, {
    onSuccess: (_, id) =>
      queryClient.setQueryData('locales', oldLocales =>
        oldLocales.filter(locale => locale.id !== id)
      ),
  });

  return { isDeleting: isLoading, deleteLocale: mutateAsync };
};

export default useDeleteLocale;
