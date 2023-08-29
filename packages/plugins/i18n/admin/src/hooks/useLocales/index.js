import * as React from 'react';

import { useAPIErrorHandler, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

import { RESOLVE_LOCALES } from '../constants';

const useLocales = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const locales = useSelector((state) => state.i18n_locales.locales);
  const isLoading = useSelector((state) => state.i18n_locales.isLoading);
  const { get } = useFetchClient();
  const { formatAPIError } = useAPIErrorHandler();

  const {
    data,
    isLoading: isLoadingLocales,
    error,
  } = useQuery(['i18n', 'locales'], async () => {
    const { data } = await get('/i18n/locales');

    return data;
  });

  React.useEffect(() => {
    if (!isLoadingLocales) {
      dispatch({ type: RESOLVE_LOCALES, locales: data });
    }
  }, [data, dispatch, isLoadingLocales]);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    }
  }, [error, formatAPIError, toggleNotification]);

  return { locales, isLoading, error };
};

export default useLocales;
