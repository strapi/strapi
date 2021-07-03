import { useQuery } from 'react-query';
import { request, useNotification } from '@strapi/helper-plugin';

const fetchDefaultLocalesList = async toggleNotification => {
  try {
    const data = await request('/i18n/iso-locales', {
      method: 'GET',
    });

    return data;
  } catch (e) {
    toggleNotification({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return [];
  }
};

const useDefaultLocales = () => {
  const toggleNotification = useNotification();
  const { isLoading, data } = useQuery('default-locales', () =>
    fetchDefaultLocalesList(toggleNotification)
  );

  return { defaultLocales: data, isLoading };
};

export default useDefaultLocales;
