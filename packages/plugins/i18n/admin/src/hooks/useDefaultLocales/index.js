import { useQuery } from 'react-query';
import { request, useNotification } from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const fetchDefaultLocalesList = async (toggleNotification) => {
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
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const toggleNotification = useNotification();
  const { isLoading, data } = useQuery('default-locales', () =>
    fetchDefaultLocalesList(toggleNotification).then((data) => {
      notifyStatus(
        formatMessage({
          id: getTrad('Settings.locales.modal.locales.loaded'),
          defaultMessage: 'The locales have been successfully loaded.',
        })
      );

      return data;
    })
  );

  return { defaultLocales: data, isLoading };
};

export default useDefaultLocales;
