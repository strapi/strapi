import { useEffect, useMemo } from 'react';

import { setLinkData } from '@strapi/admin/admin/src/content-manager/pages/App/actions';
import { makeSelectModels } from '@strapi/admin/admin/src/content-manager/pages/App/selectors';
import gatherContentTypeLinks from '@strapi/admin/admin/src/content-manager/pages/App/utils/gatherContentTypeLinks';
import {
  useFetchClient,
  useNotification,
  useRBACProvider,
  useStrapiApp,
} from '@strapi/helper-plugin';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';

import { RESOLVE_LOCALES, SET_PREFERRED_LOCALE } from '../constants';

const useLocales = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const locales = useSelector((state) => state.i18n_locales.locales);
  const isLoading = useSelector((state) => state.i18n_locales.isLoading);
  const preferredLocale = useSelector((state) => state.i18n_locales.preferredLocale);
  const modelsSelector = useMemo(makeSelectModels, []);
  const { allPermissions: userPermissions } = useRBACProvider();
  const models = useSelector(modelsSelector, shallowEqual);
  const { runHookWaterfall } = useStrapiApp();

  const setPreferredLocale = (preferredLocale) => {
    dispatch({ type: SET_PREFERRED_LOCALE, preferredLocale });
  };

  const { get } = useFetchClient();

  useEffect(() => {
    get('/i18n/locales')
      .then(({ data }) => dispatch({ type: RESOLVE_LOCALES, locales: data }))
      .catch((err) => {
        /**
         * TODO: this should be refactored.
         *
         * In fact it should be refactored to use react-query?
         */
        if ('code' in err && err?.code === 'ERR_CANCELED') {
          return;
        }

        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      });
  }, [dispatch, get, toggleNotification]);

  useEffect(() => {
    const updateLinks = async () => {
      const { authorizedCollectionTypeLinks, authorizedSingleTypeLinks } =
        await gatherContentTypeLinks({
          models,
          userPermissions,
          toggleNotification,
          runHookWaterfall,
        });
      dispatch(setLinkData({ authorizedCollectionTypeLinks, authorizedSingleTypeLinks }));
    };
    updateLinks();
  }, [dispatch, models, preferredLocale, runHookWaterfall, toggleNotification, userPermissions]);

  return { locales, isLoading, preferredLocale, setPreferredLocale };
};

export default useLocales;
