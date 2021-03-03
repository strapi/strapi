import { useState } from 'react';
import { request } from 'strapi-helper-plugin';
import { useDispatch } from 'react-redux';
import { getTrad } from '../../utils';
import { ADD_LOCALE } from '../constants';

const addLocale = async ({ code, name, isDefault }) => {
  try {
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
  } catch (e) {
    strapi.notification.toggle({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return e;
  }
};

const useAddLocale = () => {
  const [isLoading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const persistLocale = async locale => {
    setLoading(true);

    const newLocale = await addLocale(locale);

    dispatch({ type: ADD_LOCALE, newLocale });
    setLoading(false);
  };

  return { isAdding: isLoading, addLocale: persistLocale };
};

export default useAddLocale;
