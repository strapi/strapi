import { useEffect, useRef } from 'react';

import { useNotifyAT } from '@strapi/design-system';
import {
  useFetchClient,
  useNotification,
  useRBACProvider,
  useStrapiApp,
} from '@strapi/helper-plugin';
import axios from 'axios';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

import { getTrad } from '../../utils';

import { getInitData, resetInitData, setInitData } from './actions';
import { selectAppDomain } from './selectors';
import gatherContentTypeLinks from './utils/gatherContentTypeLinks';

const useContentManagerInitData = () => {
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
  const { get } = useFetchClient();

  const fetchData = async () => {
    dispatch(getInitData());

    try {
      const {
        data: {
          data: { components, contentTypes: models, fieldSizes },
        },
      } = await get('/content-manager/init', { cancelToken: source.token });
      notifyStatus(
        formatMessage({
          id: getTrad('App.schemas.data-loaded'),
          defaultMessage: 'The schemas have been successfully loaded.',
        })
      );

      const { authorizedCollectionTypeLinks, authorizedSingleTypeLinks } =
        await gatherContentTypeLinks({
          models,
          userPermissions: allPermissions,
          toggleNotification,
          runHookWaterfall,
        });

      const actionToDispatch = setInitData({
        authorizedCollectionTypeLinks,
        authorizedSingleTypeLinks,
        contentTypeSchemas: models,
        components,
        fieldSizes,
      });

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
      dispatch(resetInitData());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, toggleNotification]);

  return { ...state, refetchData: fetchDataRef.current };
};

export default useContentManagerInitData;
