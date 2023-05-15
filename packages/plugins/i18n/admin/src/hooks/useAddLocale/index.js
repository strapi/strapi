import { useState } from 'react';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { getTrad } from '../../utils';
import { ADD_LOCALE } from '../constants';

const useAddLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const { post } = useFetchClient();

  const persistLocale = async (locale) => {
    setLoading(true);

    try {
      const { data } = await post('/i18n/locales', locale);

      toggleNotification({
        type: 'success',
        message: { id: getTrad('Settings.locales.modal.create.success') },
      });

      dispatch({ type: ADD_LOCALE, newLocale: data });
    } catch (e) {
      const message = get(e, 'response.payload.message', null);

      if (message && message.includes('already exists')) {
        toggleNotification({
          type: 'warning',
          message: { id: getTrad('Settings.locales.modal.create.alreadyExist') },
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      }

      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { isAdding: isLoading, addLocale: persistLocale };
};

export default useAddLocale;
