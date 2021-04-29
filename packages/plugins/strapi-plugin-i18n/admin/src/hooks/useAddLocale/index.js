import { useState } from 'react';
import { request } from 'strapi-helper-plugin';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { getTrad } from '../../utils';
import { ADD_LOCALE } from '../constants';

const addLocale = async ({ code, name, isDefault }) => {
  const data = await request(`/i18n/locales`, {
    method: 'POST',
    body: {
      name,
      code,
      isDefault,
    },
  });

  strapi.notification.toggle({
    type: 'success',
    message: { id: getTrad('Settings.locales.modal.create.success') },
  });

  return data;
};

const useAddLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const persistLocale = async locale => {
    setLoading(true);

    try {
      const newLocale = await addLocale(locale);
      dispatch({ type: ADD_LOCALE, newLocale });
    } catch (e) {
      const message = get(e, 'response.payload.message', null);

      if (message && message.includes('already exists')) {
        strapi.notification.toggle({
          type: 'warning',
          message: { id: getTrad('Settings.locales.modal.create.alreadyExist') },
        });
      } else {
        strapi.notification.toggle({
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
