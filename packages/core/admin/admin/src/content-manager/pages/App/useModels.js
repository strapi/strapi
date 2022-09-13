import { useNotification, useRBACProvider, useStrapiApp } from '@strapi/helper-plugin';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import axios from 'axios';
import { useIntl } from 'react-intl';
import { axiosInstance } from '../../../core/utils';
import { MUTATE_COLLECTION_TYPES_LINKS, MUTATE_SINGLE_TYPES_LINKS } from '../../../exposedHooks';
import { getRequestUrl, getTrad } from '../../utils';
import { getData, resetProps, setContentTypeLinks } from './actions';
import { selectAppDomain } from './selectors';
import getContentTypeLinks from './utils/getContentTypeLinks';

const useModels = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const state = useSelector(selectAppDomain());
  const fetchDataRef = useRef();
  const { allPermissions } = useRBACProvider();
  const { runHookWaterfall } = useStrapiApp();
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();
  const { notifyStatus } = useNotifyAT();
  const { formatMessage } = useIntl();

  const fetchData = async () => {
    dispatch(getData());

    try {
      const [
        {
          data: { data: components },
        },
        {
          data: { data: models },
        },
      ] = await Promise.all(
        ['components', 'content-types'].map((endPoint) =>
          axiosInstance.get(getRequestUrl(endPoint), { cancelToken: source.token })
        )
      );

      notifyStatus(
        formatMessage({
          id: getTrad('App.schemas.data-loaded'),
          defaultMessage: 'The schemas have been successfully loaded.',
        })
      );

      const { authorizedCtLinks, authorizedStLinks } = await getContentTypeLinks(
        models,
        allPermissions,
        toggleNotification
      );

      const { ctLinks } = runHookWaterfall(MUTATE_COLLECTION_TYPES_LINKS, {
        ctLinks: authorizedCtLinks,
        models,
      });
      const { stLinks } = runHookWaterfall(MUTATE_SINGLE_TYPES_LINKS, {
        stLinks: authorizedStLinks,
        models,
      });

      const actionToDispatch = setContentTypeLinks(ctLinks, stLinks, models, components);

      dispatch(actionToDispatch);
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }

      console.error(err);

      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
    }
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchDataRef.current();

    return () => {
      source.cancel('Operation canceled by the user.');
      dispatch(resetProps());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, toggleNotification]);

  return { ...state, refetchData: fetchDataRef.current };
};

export default useModels;
