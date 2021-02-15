import { request } from 'strapi-helper-plugin';
import { useMutation, useQueryClient } from 'react-query';
import { getTrad } from '../../utils';

const addLocale = async ({ code, name }) => {
  try {
    const data = await request(`/i18n/locales`, {
      method: 'POST',
      body: {
        name,
        code,
      },
    });

    strapi.notification.toggle({
      type: 'success',
      message: { id: getTrad('Settings.locales.modal.create.success') },
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

const useAddLocale = () => {
  const queryClient = useQueryClient();

  const { isLoading, mutateAsync } = useMutation(addLocale, {
    onSuccess: data => queryClient.setQueryData(['locales', { id: data.id }], data),
  });

  return { isAdding: isLoading, addLocale: mutateAsync };
};

export default useAddLocale;
